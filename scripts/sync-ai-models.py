#!/usr/bin/env python3
"""
Sync AI model benchmark data from Artificial Analysis.

Usage:
    python scripts/sync-ai-models.py

What it does:
    1. Launches a headless browser
    2. Navigates to the Artificial Analysis model comparison page (triggers prefetch)
    3. For each target model slug, fetches its RSC data via /models/{slug}?_rsc=1
    4. Extracts the full model object (anchored on `intelligenceIndex` to skip the
       lightweight summary object that appears before the full model data)
    5. Cleans the raw data and writes it to src/data/ai-models.json
    6. Uses hybrid field reads (camelCase first, snake_case fallback) to handle
       AA's RSC format change from snake_case to camelCase (July 2026)

Requirements:
    - Python 3.x with `playwright` installed
    - Playwright browsers installed (`playwright install chromium`)
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).parent.parent.resolve()
DATA_DIR = REPO_ROOT / "src" / "data"
OUTPUT_FILE = DATA_DIR / "ai-models.json"

# The comparison page with the model filter applied
TARGET_URL = (
    "https://artificialanalysis.ai/models/deepseek-v4-pro"
    "?models=gpt-5-4-mini,gpt-oss-120b,gpt-5-5,gpt-5-4,"
    "gpt-5-6-terra-xhigh,gpt-5-6-sol-xhigh,gpt-5-6-luna-xhigh,"
    "gpt-5-6-terra,gpt-5-6-terra-high,gpt-5-6-terra-medium,gpt-5-6-terra-low,gpt-5-6-terra-non-reasoning,"
    "gpt-5-6-sol,gpt-5-6-sol-high,gpt-5-6-sol-medium,gpt-5-6-sol-low,gpt-5-6-sol-non-reasoning,"
    "gpt-5-6-luna,gpt-5-6-luna-high,gpt-5-6-luna-medium,gpt-5-6-luna-low,gpt-5-6-luna-non-reasoning,"
    "muse-spark,"
    "gemini-3-1-pro-preview,gemini-3-5-flash,gemini-3-6-flash,"
    "claude-sonnet-4-6-adaptive,claude-sonnet-5,claude-opus-4-7,claude-opus-4-8,claude-opus-5,"
    "deepseek-v4-flash,deepseek-v4-pro,"
    "deepseek-v3-2-reasoning,grok-4-20,grok-4-3,grok-4-5,minimax-m2-7,minimax-m3,"
    "nvidia-nemotron-3-super-120b-a12b,nvidia-nemotron-3-ultra-550b-a55b,"
    "kimi-k2-6,kimi-k3,mimo-v2-omni,mimo-v2-5-pro,mimo-v2-5-0424,mimo-v2-pro,"
    "glm-5-1,qwen3-6-plus,qwen3-7-max,qwen3-7-plus,qwen3-8-max,claude-4-5-sonnet-thinking,claude-opus-4-6-adaptive,"
    "minimax-m2-5,kimi-k2-5,kimi-k2-7-code,glm-5-2,claude-fable-5,hy3"
    "&intelligence=coding-index"
    "&intelligence-index-cost=intelligence-vs-cost"
)

# Custom display names for models with ugly slugs
DISPLAY_NAMES = {
    "mimo-v2-5-0424": "MiMo-V2.5",
}

MIN_MODELS = 5


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def get_filtered_slugs(url: str) -> set[str]:
    """Extract the model slugs from the URL's `models` query param."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    models_param = params.get("models", [""])[0]
    return set(models_param.split(",")) if models_param else set()


def extract_models_from_page(page, target_slugs: set[str] | None = None) -> list[dict]:
    """
    Extract model data from window.__next_f via browser evaluation.
    The data is embedded in Next.js streaming chunks.
    """
    log("Extracting model data from window.__next_f...")

    # Get the full concatenated text from the browser (no timeout — just returns a string)
    result = page.evaluate(
        """
        () => {
            const next_f = window.__next_f;
            if (!next_f) return null;
            let text = '';
            for (const entry of next_f) {
                if (Array.isArray(entry) && entry.length > 1) {
                    text += String(entry[1]);
                }
            }
            return text;
        }
    """
    )

    if not result:
        raise RuntimeError("Browser extraction failed: no __next_f data")

    log(f"Got {len(result)} chars of text, parsing in Python...")
    return _parse_models_from_text(result, target_slugs)


def _parse_models_from_text(text: str, target_slugs: set[str] | None) -> list[dict]:
    """Parse model objects from the concatenated __next_f text. Done in Python to avoid browser timeout."""
    import re
    import json as _json

    models = []
    seen = set()

    if target_slugs:
        for slug in target_slugs:
            if slug in seen:
                continue
            # Find all occurrences of this slug
            for m in re.finditer(r'"slug":"' + re.escape(slug) + r'"', text):
                slug_pos = m.start()
                # Look for intelligence_index within 50KB after the slug
                intel_idx = text.find('"intelligenceIndex"', slug_pos)
                if intel_idx < 0:
                    intel_idx = text.find('"intelligence_index"', slug_pos)
                if intel_idx < 0 or intel_idx > slug_pos + 50000:
                    continue
                # Find enclosing { (search backwards, up to 2KB)
                obj_start = -1
                for i in range(slug_pos, max(0, slug_pos - 2000), -1):
                    if text[i] == '{':
                        obj_start = i
                        break
                if obj_start < 0:
                    continue
                # Find matching } (search forwards, up to 30KB)
                depth = 0
                in_str = False
                escape = False
                obj_end = -1
                search_end = min(len(text), obj_start + 30000)
                for i in range(obj_start, search_end):
                    c = text[i]
                    if escape:
                        escape = False
                        continue
                    if c == '\\':
                        escape = True
                        continue
                    if c == '"':
                        in_str = not in_str
                        continue
                    if not in_str:
                        if c == '{':
                            depth += 1
                        elif c == '}':
                            depth -= 1
                            if depth == 0:
                                obj_end = i + 1
                                break
                if obj_end < 0:
                    continue
                obj_str = text[obj_start:obj_end]
                if '"intelligenceIndex"' not in obj_str and '"intelligence_index"' not in obj_str:
                    continue
                try:
                    obj = _json.loads(obj_str)
                    models.append(obj)
                    seen.add(slug)
                    break
                except Exception:
                    pass
    else:
        # Fallback: scan all intelligenceIndex
        for m in re.finditer(r'"intelligenceIndex":', text):
            idx = m.start()
            search_start = max(0, idx - 5000)
            obj_start = text.rfind('{', search_start, idx)
            if obj_start < search_start:
                obj_start = -1
            if obj_start < 0:
                continue
            search_end = min(len(text), idx + 5000)
            depth = 0
            in_str = False
            escape = False
            obj_end = -1
            for i in range(obj_start, search_end):
                c = text[i]
                if escape:
                    escape = False
                    continue
                if c == '\\':
                    escape = True
                    continue
                if c == '"':
                    in_str = not in_str
                    continue
                if not in_str:
                    if c == '{':
                        depth += 1
                    elif c == '}':
                        depth -= 1
                        if depth == 0:
                            obj_end = i + 1
                            break
            if obj_end < 0:
                continue
            obj_str = text[obj_start:obj_end]
            if '"name"' not in obj_str:
                continue
            slug_match = re.search(r'"slug":"([^"]+)"', obj_str)
            if not slug_match:
                continue
            slug = slug_match.group(1)
            if slug in seen:
                continue
            seen.add(slug)
            try:
                obj = _json.loads(obj_str)
                models.append(obj)
            except Exception:
                pass

    return models


def clean_model(raw: dict) -> dict | None:
    """Transform a raw model dict into our cleaned schema.
    Uses hybrid field reads (camelCase first, snake_case fallback) to handle
    AA's RSC format change from snake_case to camelCase (July 2026).
    """
    name = raw.get("name")
    slug = raw.get("slug")
    intelligence = raw.get("intelligenceIndex", raw.get("intelligence_index"))

    if not name or not slug:
        return None
    # Allow null intelligence_index for brand-new models that AA hasn't
    # benchmarked yet. The chart skips points with null intelligence.

    # Extract creator name (AA changed from model_creators list to single creator dict)
    creator = raw.get("creator")
    if isinstance(creator, dict):
        creator_name = creator.get("name", "Unknown")
    else:
        creators = raw.get("model_creators", [])
        if isinstance(creators, list) and creators:
            creator_name = creators[0].get("name") if isinstance(creators[0], dict) else str(creators[0])
        elif isinstance(creators, dict):
            creator_name = creators.get("name", "Unknown")
        else:
            creator_name = "Unknown"

    # Price fields
    input_price = raw.get("price1mInputTokens", raw.get("price_1m_input_tokens"))
    output_price = raw.get("price1mOutputTokens", raw.get("price_1m_output_tokens"))
    cache_hit_price = raw.get("cacheHitPrice", raw.get("cache_hit_price"))

    # Blended price: prefer 7:2:1 (cache:input:output), fallback to 3:1, then compute
    blended_price = raw.get("price1mBlended7To2To1", raw.get("price_1m_blended_7_2_1"))
    if blended_price is None:
        blended_price = raw.get("price1mBlended0To3To1", raw.get("price_1m_blended_0_3_1"))
    if blended_price is None and input_price is not None and output_price is not None:
        blended_price = (float(input_price) * 3 + float(output_price)) / 4

    # Cost to run intelligence index (total -> total_cost fallback)
    cost_data = raw.get("intelligenceIndexCost", raw.get("intelligence_index_cost", {}))
    total_cost = None
    if isinstance(cost_data, dict):
        total_cost = cost_data.get("total", cost_data.get("total_cost"))

    # Briefcase Elo (nested in briefcaseBreakdown.overall.elo)
    briefcase = raw.get("briefcaseBreakdown")
    briefcase_elo = None
    if isinstance(briefcase, dict):
        overall = briefcase.get("overall", {})
        if isinstance(overall, dict):
            briefcase_elo = overall.get("elo")

    return {
        "id": slug,
        "name": name,
        "shortName": DISPLAY_NAMES.get(slug, raw.get("shortName", raw.get("short_name")) or name),
        "provider": creator_name,
        "intelligenceIndex": float(intelligence) if intelligence is not None else None,
        "codingIndex": raw.get("codingIndex", raw.get("coding_index")),
        "agenticIndex": raw.get("agenticIndex", raw.get("agentic_index")),
        "mathIndex": raw.get("mathIndex", raw.get("math_index")),
        "inputPrice": float(input_price) if input_price is not None else None,
        "outputPrice": float(output_price) if output_price is not None else None,
        "cacheInputPrice": float(cache_hit_price) if cache_hit_price is not None else None,
        "blendedPrice": float(blended_price) if blended_price is not None else None,
        "costToRunIndex": float(total_cost) if total_cost is not None else None,
        "isOpenWeights": raw.get("isOpenWeights", raw.get("is_open_weights")),
        "releaseDate": raw.get("releaseDate", raw.get("release_date")),
        "contextWindow": raw.get("contextWindowTokens", raw.get("context_window_tokens")),
        "url": f"https://artificialanalysis.ai/models/{slug}",
        # Benchmark scores
        "gpqa": raw.get("gpqa"),
        "aime": raw.get("aime"),
        "aime25": raw.get("aime25"),
        "humaneval": raw.get("humaneval"),
        "livecodebench": raw.get("livecodebench"),
        "scicode": raw.get("scicode"),
        "mmluPro": raw.get("mmluPro", raw.get("mmlu_pro")),
        "math500": raw.get("math500", raw.get("math_500")),
        "hle": raw.get("hle"),
        "gdpval": raw.get("gdpval"),
        "ifbench": raw.get("ifbench"),
        "tau2": raw.get("tau2"),
        "terminalbenchHard": raw.get("terminalbenchHard", raw.get("terminalbench_hard")),
        "critpt": raw.get("critpt"),
        "mmmuPro": raw.get("mmmuPro", raw.get("mmmu_pro")),
        "multilingualAA": raw.get("multilingualAA", raw.get("multilingual_aa")),
        "omniscience": raw.get("omniscience"),
        "lcr": raw.get("lcr"),
        # New benchmarks (July 2026 — Intelligence Index v4.1 + standalone agentic benchmarks)
        "tauBanking": raw.get("tauBanking"),
        "terminalbenchV21": raw.get("terminalbenchV21"),
        "automationBench": raw.get("automationBenchPartialScore"),
        "enterpriseOpsGym": raw.get("enterpriseOpsGym"),
        "harveyLabAllPass": raw.get("harveyLabAllPass"),
        "apexAgents": raw.get("apexAgents"),
        "itBenchSre": raw.get("itBenchSre"),
        "briefcaseElo": briefcase_elo,
    }


def fetch_and_clean(url: str) -> list[dict]:
    """Fetch models from the page and clean them."""
    target_slugs = get_filtered_slugs(url)
    log(f"Target slugs from URL: {len(target_slugs)}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        log(f"Navigating to Artificial Analysis...")
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(15000)
        # Scroll to bottom to trigger lazy-loaded chart data
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(10000)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(5000)

        # Fetch each model's RSC data directly via the browser context
        # The RSC response contains the full model JSON
        raw_models = []
        fetch_failures = {}
        for slug in target_slugs:
            rsc_url = f"https://artificialanalysis.ai/models/{slug}?_rsc=1"
            try:
                resp = page.context.request.get(rsc_url, headers={"RSC": "1"})
                if resp.status != 200:
                    fetch_failures[slug] = f"HTTP {resp.status}"
                    continue
                text = resp.text()
                # Strategy: find intelligence_index, then search backwards for the {
                # that starts the full model object. We verify by checking if the
                # object contains our slug (skipping nested objects).
                intel_pos = text.find('"intelligenceIndex"')
                if intel_pos < 0:
                    intel_pos = text.find('"intelligence_index"')
                if intel_pos < 0:
                    fetch_failures[slug] = "no intelligenceIndex in response"
                    continue
                # Search backwards from intelligence_index, up to 50KB
                # (must be large enough to find the { that opens the model object
                # — for some models it's 10-15KB before the intelligence_index field)
                best_obj = None
                for candidate_start in range(intel_pos, max(0, intel_pos - 50000), -1):
                    if text[candidate_start] != '{':
                        continue
                    # Find matching } — no forward limit; model objects can be 20KB+
                    depth = 0
                    in_str = False
                    escape = False
                    obj_end = -1
                    search_end = min(len(text), candidate_start + 200000)
                    for i in range(candidate_start, search_end):
                        c = text[i]
                        if escape:
                            escape = False
                            continue
                        if c == '\\':
                            escape = True
                            continue
                        if c == '"':
                            in_str = not in_str
                            continue
                        if not in_str:
                            if c == '{':
                                depth += 1
                            elif c == '}':
                                depth -= 1
                                if depth == 0:
                                    obj_end = i + 1
                                    break
                    if obj_end < 0:
                        continue
                    obj_str = text[candidate_start:obj_end]
                    # Verify this object contains our slug
                    if f'"slug":"{slug}"' not in obj_str:
                        continue
                    # Found it!
                    try:
                        import json as _json
                        best_obj = _json.loads(obj_str)
                        break
                    except Exception:
                        continue
                if best_obj is not None:
                    raw_models.append(best_obj)
                else:
                    fetch_failures[slug] = "no enclosing object found containing slug"
            except Exception as e:
                fetch_failures[slug] = f"exception: {e}"
                continue

        if fetch_failures:
            log(f"  Fetch failures ({len(fetch_failures)}):")
            for slug, reason in fetch_failures.items():
                log(f"    {slug}: {reason}")

        log(f"Fetched {len(raw_models)} models via RSC")
        browser.close()

    # Clean all models
    cleaned = []
    seen_ids = set()
    for raw in raw_models:
        model = clean_model(raw)
        if model and model["id"] not in seen_ids:
            seen_ids.add(model["id"])
            cleaned.append(model)

    log(f"Cleaned to {len(cleaned)} unique models")

    # Filter to target slugs if specified
    if target_slugs:
        filtered = [m for m in cleaned if m["id"] in target_slugs]
        log(f"Filtered to {len(filtered)} models matching URL selection")
        return filtered

    return cleaned


def compute_ranks(models: list[dict]) -> list[dict]:
    """Sort by intelligence and assign ranks. Models with null intelligence
    are kept in the data but not ranked (they appear at the end)."""
    ranked = [m for m in models if m.get("intelligenceIndex") is not None]
    ranked.sort(key=lambda m: m["intelligenceIndex"], reverse=True)

    for i, model in enumerate(ranked, 1):
        model["intelligenceRank"] = i

    # Append unranked models (e.g., brand-new launches without AA benchmarks yet)
    unranked = [m for m in models if m.get("intelligenceIndex") is None]

    return ranked + unranked


def write_output(models: list[dict]) -> None:
    """Write the cleaned data to JSON."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "lastUpdated": datetime.now().isoformat(),
        "sourceUrl": TARGET_URL,
        "modelCount": len(models),
        "models": models,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    log(f"Wrote {len(models)} models to {OUTPUT_FILE}")


def validate_output() -> tuple[bool, str]:
    """Validate the generated file."""
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        models = data.get("models", [])
        if len(models) < MIN_MODELS:
            return False, f"Only {len(models)} models found (min {MIN_MODELS})"

        required = {"name", "intelligenceIndex", "id", "provider"}
        missing = required - set(models[0].keys())
        if missing:
            return False, f"Missing fields: {missing}"

        # Check that we have price or cost data for at least some models
        with_price = sum(1 for m in models if m.get("inputPrice") is not None)
        with_cost = sum(1 for m in models if m.get("costToRunIndex") is not None)
        if with_price == 0 and with_cost == 0:
            return False, "No models have price or cost data"

        log(f"Validation passed: {len(models)} models, {with_price} with price, {with_cost} with cost")
        return True, ""

    except (json.JSONDecodeError, FileNotFoundError) as e:
        return False, str(e)


def main() -> int:
    log("=" * 60)
    log("Starting AI Models sync from Artificial Analysis")
    log("=" * 60)

    try:
        models = fetch_and_clean(TARGET_URL)
    except Exception as e:
        log(f"ERROR fetching data: {e}")
        import traceback

        traceback.print_exc()
        return 1

    if not models:
        log("ERROR: No models extracted")
        return 1

    models = compute_ranks(models)
    write_output(models)

    is_valid, reason = validate_output()
    if not is_valid:
        log(f"VALIDATION FAILED: {reason}")
        return 1

    log("Sync complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
