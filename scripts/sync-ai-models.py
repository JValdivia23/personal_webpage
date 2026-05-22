#!/usr/bin/env python3
"""
Sync AI model benchmark data from Artificial Analysis.

Usage:
    python scripts/sync-ai-models.py

What it does:
    1. Launches a headless browser
    2. Navigates to the Artificial Analysis model comparison page
    3. Extracts embedded model data from window.__next_f (Next.js streaming)
    4. Writes cleaned data to src/data/ai-models.json

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
    "?models=gpt-5-4-mini,gpt-oss-120b,gpt-5-5,gpt-5-4,muse-spark,"
    "gemini-3-1-pro-preview,gemini-3-5-flash,"
    "claude-sonnet-4-6-adaptive,claude-opus-4-7,"
    "deepseek-v4-flash,deepseek-v4-flash-high,deepseek-v4-pro,"
    "deepseek-v3-2-reasoning,grok-4-20,minimax-m2-7,"
    "nvidia-nemotron-3-super-120b-a12b,kimi-k2-6,mimo-v2-omni,mimo-v2-5-pro,mimo-v2-pro,"
    "glm-5-1,qwen3-6-plus,qwen3-7-max,claude-4-5-sonnet-thinking,claude-opus-4-6-adaptive,"
    "minimax-m2-5,kimi-k2-5"
    "&intelligence=coding-index"
    "&intelligence-index-cost=intelligence-vs-cost"
)

MIN_MODELS = 5


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def get_filtered_slugs(url: str) -> set[str]:
    """Extract the model slugs from the URL's `models` query param."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    models_param = params.get("models", [""])[0]
    return set(models_param.split(",")) if models_param else set()


def extract_models_from_page(page) -> list[dict]:
    """
    Extract model data from window.__next_f via browser evaluation.
    The data is embedded in Next.js streaming chunks.
    """
    log("Extracting model data from window.__next_f...")

    result = page.evaluate(
        """
        () => {
            const next_f = window.__next_f;
            if (!next_f) return {error: 'no __next_f'};

            // Concatenate all entries — model data spans across entry boundaries
            let text = '';
            for (const entry of next_f) {
                if (Array.isArray(entry) && entry.length > 1) {
                    text += String(entry[1]);
                }
            }

            const models = [];
            let pos = 0;

            while (true) {
                const idx = text.indexOf('"intelligence_index":', pos);
                if (idx === -1) break;

                const objStart = text.lastIndexOf('{', idx);
                if (objStart === -1) { pos = idx + 1; continue; }

                let depth = 0;
                let inStr = false;
                let escape = false;
                let objEnd = objStart;
                for (let i = objStart; i < text.length; i++) {
                    const c = text[i];
                    if (escape) { escape = false; continue; }
                    if (c === '\\\\') { escape = true; continue; }
                    if (c === '"') { inStr = !inStr; continue; }
                    if (!inStr) {
                        if (c === '{') depth++;
                        else if (c === '}') {
                            depth--;
                            if (depth === 0) { objEnd = i + 1; break; }
                        }
                    }
                }

                const objStr = text.slice(objStart, objEnd);
                if (objStr.includes('"name"')) {
                    try {
                        const obj = JSON.parse(objStr);
                        models.push(obj);
                    } catch (e) {}
                }
                pos = idx + 1;
            }

            return {
                totalFound: models.length,
                models: models
            };
        }
    """
    )

    if "error" in result:
        raise RuntimeError(f"Browser extraction failed: {result['error']}")

    log(f"Browser extracted {result['totalFound']} raw models")
    return result["models"]


def clean_model(raw: dict) -> dict | None:
    """Transform a raw model dict into our cleaned schema."""
    name = raw.get("name")
    slug = raw.get("slug")
    intelligence = raw.get("intelligence_index")

    if not name or not slug or intelligence is None:
        return None

    # Extract creator name
    creators = raw.get("model_creators", [])
    if isinstance(creators, list) and creators:
        creator_name = creators[0].get("name") if isinstance(creators[0], dict) else str(creators[0])
    elif isinstance(creators, dict):
        creator_name = creators.get("name", "Unknown")
    else:
        creator_name = "Unknown"

    # Price fields
    input_price = raw.get("price_1m_input_tokens")
    output_price = raw.get("price_1m_output_tokens")
    cache_hit_price = raw.get("cache_hit_price")

    # Blended price: prefer 7:2:1 (cache:input:output), fallback to 3:1, then compute
    blended_price = raw.get("price_1m_blended_7_2_1")
    if blended_price is None:
        blended_price = raw.get("price_1m_blended_0_3_1")
    if blended_price is None and input_price is not None and output_price is not None:
        blended_price = (float(input_price) * 3 + float(output_price)) / 4

    # Cost to run intelligence index
    cost_data = raw.get("intelligence_index_cost", {})
    total_cost = cost_data.get("total_cost") if isinstance(cost_data, dict) else None

    return {
        "id": slug,
        "name": name,
        "shortName": raw.get("short_name") or name,
        "provider": creator_name,
        "intelligenceIndex": float(intelligence),
        "codingIndex": raw.get("coding_index"),
        "agenticIndex": raw.get("agentic_index"),
        "mathIndex": raw.get("math_index"),
        "inputPrice": float(input_price) if input_price is not None else None,
        "outputPrice": float(output_price) if output_price is not None else None,
        "cacheInputPrice": float(cache_hit_price) if cache_hit_price is not None else None,
        "blendedPrice": float(blended_price) if blended_price is not None else None,
        "costToRunIndex": float(total_cost) if total_cost is not None else None,
        "isOpenWeights": raw.get("is_open_weights"),
        "releaseDate": raw.get("release_date"),
        "contextWindow": raw.get("context_window_tokens"),
        "url": f"https://artificialanalysis.ai/models/{slug}",
        # Benchmark scores
        "gpqa": raw.get("gpqa"),
        "aime": raw.get("aime"),
        "aime25": raw.get("aime25"),
        "humaneval": raw.get("humaneval"),
        "livecodebench": raw.get("livecodebench"),
        "scicode": raw.get("scicode"),
        "mmluPro": raw.get("mmlu_pro"),
        "math500": raw.get("math_500"),
        "hle": raw.get("hle"),
        "gdpval": raw.get("gdpval"),
        "ifbench": raw.get("ifbench"),
        "tau2": raw.get("tau2"),
        "terminalbenchHard": raw.get("terminalbench_hard"),
        "critpt": raw.get("critpt"),
        "mmmuPro": raw.get("mmmu_pro"),
        "multilingualAA": raw.get("multilingual_aa"),
        "omniscience": raw.get("omniscience"),
        "lcr": raw.get("lcr"),
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
        page.wait_for_timeout(5000)

        raw_models = extract_models_from_page(page)
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
    """Sort by intelligence and assign ranks."""
    # Only rank models with valid intelligence
    valid = [m for m in models if m.get("intelligenceIndex") is not None]
    valid.sort(key=lambda m: m["intelligenceIndex"], reverse=True)

    for i, model in enumerate(valid, 1):
        model["intelligenceRank"] = i

    return valid


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
