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
    7. Verifies v5 source identity/version and enriches Code2Video-AA with its
       own evaluation rows, confidence intervals, and API cost estimates
    8. Requires all target rows and validates them before writing

Requirements:
    - Python 3.10+ with `playwright` installed
    - Playwright browsers installed (`playwright install chromium`)
"""

import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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
    "gpt-6-sol,gpt-6-sol-xhigh,gpt-6-sol-high,gpt-6-sol-medium,gpt-6-sol-low,gpt-6-sol-non-reasoning,"
    "gpt-6-1-sol,gpt-6-1-sol-xhigh,gpt-6-1-sol-high,gpt-6-1-sol-medium,gpt-6-1-sol-low,gpt-6-1-terra,"
    "gpt-6-luna,gpt-6-luna-xhigh,gpt-6-luna-high,gpt-6-luna-medium,gpt-6-luna-low,gpt-6-luna-non-reasoning,"
    "gpt-6-astra,gpt-6-astra-xhigh,gpt-6-astra-high,gpt-6-astra-medium,gpt-6-astra-low,"
    "muse-spark,muse-spark-1-2,muse-spark-1-3,muse-spark-1-3-xhigh,muse-spark-open,muse-wonder,muse-wonder-full,"
    "gemini-3-1-pro-preview,gemini-3-5-flash,gemini-3-6-flash,gemini-3-7-flash,gemini-3-7-flash-medium,gemini-3-7-flash-low,gemini-3-8-flash,gemini-3-8-flash-medium,gemini-3-8-flash-low,gemini-4-argon,gemini-4-carbon,"
    "claude-sonnet-4-6-adaptive,claude-sonnet-5,claude-sonnet-5-5,claude-sonnet-5-5-xhigh,claude-sonnet-5-5-high,claude-sonnet-5-5-medium,claude-sonnet-5-5-low,claude-haiku-5-5,claude-haiku-5-5-xhigh,claude-haiku-5-5-high,claude-haiku-5-5-medium,claude-haiku-5-5-low,claude-opus-4-7,claude-opus-4-8,claude-opus-5,claude-opus-5-5,claude-opus-5-5-xhigh,claude-opus-5-5-high,claude-opus-5-5-medium,claude-opus-5-5-low,"
    "deepseek-v4-flash,deepseek-v4-flash-vision,deepseek-v4-pro,deepseek-v4-1-flash,deepseek-v4-1-flash-1017,"
    "deepseek-v3-2-reasoning,grok-4-20,grok-4-3,grok-4-5,grok-4-6,grok-4-7,grok-4-7-high,minimax-m2-7,minimax-m3,minimax-m3-1-flash,"
    "nvidia-nemotron-3-super-120b-a12b,nvidia-nemotron-3-ultra-550b-a55b,"
    "kimi-k2-6,kimi-k3,kimi-k3-1-pro,mimo-v2-omni,mimo-v2-5-pro,mimo-v2-5-0424,mimo-v2-pro,mimo-v2-6-pro,mimo-v2-6-flash,"
    "glm-5-1,qwen3-6-plus,qwen3-7-max,qwen3-7-plus,qwen3-8-max,qwen3-8-2-4t-a95b,qwen3-8-27b,claude-4-5-sonnet-thinking,claude-opus-4-6-adaptive,"
    "minimax-m2-5,kimi-k2-5,kimi-k2-7-code,glm-5-2,glm-5-3,glm-5-3-flash,claude-fable-5,claude-fable-5-1,claude-fable-5-1-medium,claude-fable-5-1-xhigh,hy3"
    "&intelligence=coding-index"
    "&intelligence-index-cost=intelligence-vs-cost"
)

# Custom display names for models with ugly slugs
DISPLAY_NAMES = {
    "mimo-v2-5-0424": "MiMo-V2.5",
}

MIN_MODELS = 5
INTELLIGENCE_INDEX_VERSION = "5.0"
V5_EVALUATIONS = frozenset({
    "aa-briefcase", "automationbench-aa", "gdp-pdf", "frontiercode-2-0",
    "terminalbench-4-0", "terminal-bench-science", "critpt-v2-hard",
    "omniscience", "hle-diamond",
})
CODE2VIDEO_URL = "https://artificialanalysis.ai/evaluations/code2video-aa"
CODE2VIDEO_TASK_COUNT = 114
METRIC_VERSIONS = {
    "codingIndex": "local-v5.0",
    "knowledgeWorkIndex": "local-v5.0",
    "scienceIndex": "local-v5.0",
    "generalIndex": "local-v5.0",
    "agenticIndex": "legacy-local-v4.3",
    "omniscience": "1.1",
    "hle": "legacy-HLE",
    "critpt": "legacy-CritPt",
    "frontierCode20": "2.0",
    "terminalbenchScience": "0.1.0",
    "hleDiamond": "HLE-Diamond",
    "critptV2Hard": "2-hard",
    "code2videoElo": "Code2Video-AA",
}


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def get_filtered_slugs(url: str) -> set[str]:
    """Extract the model slugs from the URL's `models` query param."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    models_param = params.get("models", [""])[0]
    return set(models_param.split(",")) if models_param else set()


def weighted_category(*components: tuple[float, float | None]) -> float | None:
    """Local category score; missing components never become zero or reweight."""
    if any(value is None for _, value in components):
        return None
    return sum(weight * float(value) for weight, value in components) * 100


def _property_values(text: str, name: str):
    """Decode inline JSON properties without fixed RSC payload-size limits."""
    decoder = json.JSONDecoder()
    for match in re.finditer(r'"' + re.escape(name) + r'"\s*:\s*', text):
        try:
            value, _ = decoder.raw_decode(text, match.end())
            yield value
        except json.JSONDecodeError:
            continue


def _is_full_model(raw, slug: str) -> bool:
    return (
        isinstance(raw, dict) and raw.get("slug") == slug and bool(raw.get("name"))
        and any(key in raw for key in ("contextWindowTokens", "context_window_tokens"))
        and any(key in raw for key in ("intelligenceIndex", "intelligence_index"))
    )


def validate_source_model(raw: dict, slug: str, text: str) -> None:
    """Fail closed on summaries, wrong identities, or a changed index suite."""
    if not _is_full_model(raw, slug):
        raise ValueError(f"No full matching model object for {slug}")
    if f"Intelligence Index v{INTELLIGENCE_INDEX_VERSION}" not in text:
        raise ValueError(f"Unverified Intelligence Index version for {slug}")
    evaluations = raw.get("intelligenceIndexEvaluations")
    if evaluations and {e["slug"] for e in evaluations} != V5_EVALUATIONS:
        raise ValueError(f"Unexpected Intelligence Index evaluation suite for {slug}")
    # AA can publish a score without evaluation-cost rows (e.g. Flash low).
    # An empty evaluations array is not by itself evidence of a missing score.


def extract_code2video_models(text: str) -> dict[str, dict]:
    """Evaluation rows include benchmark-specific canonical token counts."""
    for rows in _property_values(text, "initialModels"):
        if not isinstance(rows, list):
            continue
        matches = [row for row in rows if isinstance(row, dict)
                   and row.get("slug") and row.get("code2videoElo") is not None]
        if matches:
            models = {row["slug"]: row for row in matches}
            if len(models) != len(matches):
                raise ValueError("Duplicate Code2Video-AA model slugs")
            return models
    raise ValueError("No Code2Video-AA evaluation rows found")


def code2video_costs(raw: dict) -> tuple[float | None, float | None]:
    """Estimate contestant API costs from AA's uncached, single-call tokens.

    Code2Video-AA runs 114 briefs once. Do not borrow Intelligence Index costs,
    assume missing token counts are zero, or guess future cache accounting.
    """
    counts = raw.get("canonicalEvalTokenCounts") or {}
    tokens = counts.get("code2video") or {}
    values = [tokens.get(k) for k in ("input", "answer", "reasoning")]
    input_price = raw.get("price1mInputTokens")
    output_price = raw.get("price1mOutputTokens")
    if (any(v is None for v in (*values, input_price, output_price))
            or tokens.get("cacheableInput") not in (None, 0)):
        return None, None
    if any(not math.isfinite(float(v)) or float(v) < 0 for v in (*values, input_price, output_price)):
        raise ValueError("Invalid Code2Video-AA tokens or prices")
    total = (float(values[0]) * float(input_price)
             + (float(values[1]) + float(values[2])) * float(output_price)) / 1_000_000
    return total, total / CODE2VIDEO_TASK_COUNT


def enrich_code2video(models: list[dict], evaluation_models: dict[str, dict]) -> None:
    for model in models:
        raw = evaluation_models.get(model["id"])
        if raw is None:
            if model["code2videoElo"] is not None:
                raise ValueError(f"Code2Video-AA evaluation row missing: {model['id']}")
            continue
        # Match exact effort slugs, never attach family-level results to variants.
        if (model["code2videoElo"] is not None
                and not math.isclose(model["code2videoElo"], raw["code2videoElo"], abs_tol=0.01)):
            raise ValueError(f"Code2Video-AA sources disagree: {model['id']}")
        model["code2videoElo"] = raw["code2videoElo"]
        breakdown = raw.get("code2videoBreakdown") or {}
        if breakdown.get("lower95ci") is not None and breakdown.get("upper95ci") is not None:
            model["code2videoEloInterval"] = {
                "lower": breakdown["lower95ci"], "upper": breakdown["upper95ci"],
            }
        model["code2videoCostToRun"], model["code2videoCostPerTask"] = code2video_costs(raw)


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
        for slug in sorted(target_slugs):
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

    # Evaluation-weighted average API cost per Intelligence Index task, nested in
    # intelligenceIndexCostPerTask.cost.total)
    cpt_data = raw.get("intelligenceIndexCostPerTask", raw.get("intelligence_index_cost_per_task", {}))
    cost_per_task = None
    if isinstance(cpt_data, dict):
        cpt_cost = cpt_data.get("cost", {})
        if isinstance(cpt_cost, dict):
            cost_per_task = cpt_cost.get("total")

    # Briefcase Elo (nested in briefcaseBreakdown.overall.elo)
    briefcase = raw.get("briefcaseBreakdown")
    briefcase_elo = None
    if isinstance(briefcase, dict):
        overall = briefcase.get("overall", {})
        if isinstance(overall, dict):
            briefcase_elo = overall.get("elo")

    gdpval = raw.get("gdpval")
    automation = raw.get("automationBenchPartialScore")
    tb21 = raw.get("terminalbenchV21", raw.get("terminalBench21", raw.get("terminalbench_v2_1")))
    tb40 = raw.get("terminalbenchV40", raw.get("terminalBench40", raw.get("terminalbench_v4_0")))
    scicode = raw.get("scicode")

    # v5 category reconstructions are local, not AA's Coding Agent Index or
    # published composites. Never fall back to a different benchmark version.
    frontier_code = raw.get("frontierCode20", raw.get("frontier_code_2_0"))
    terminal_science = raw.get("terminalBenchScience", raw.get("terminal_bench_science"))
    hle_diamond = raw.get("hleDiamond", raw.get("hle_diamond"))
    critpt_hard = raw.get("critptAgenticHard", raw.get("critpt_agentic_hard"))
    omniscience_accuracy = raw.get("omniscienceAccuracy", raw.get("omniscience_accuracy"))
    omniscience_hallucination = raw.get("omniscienceHallucinationRate", raw.get("omniscience_hallucination_rate"))
    coding_index = weighted_category((0.6, frontier_code), (0.4, tb40))

    # Legacy Agentic Index: retained in JSON for compatibility, not in the UI.
    # Reconstruct from the Agents category (30% of II): AA-Briefcase 15%,
    # GDPval-AA v2 10%, AutomationBench-AA 5% → 50% / 33.3% / 16.7%.
    # Elo scores use AA's documented mapping clamp((Elo - 500) / 2000).
    def _elo_to_unit(elo):
        if elo is None:
            return None
        return max(0.0, min(1.0, (float(elo) - 500.0) / 2000.0))

    briefcase_n = _elo_to_unit(briefcase_elo)
    knowledge_work_index = weighted_category(
        (0.6, briefcase_n), (0.2, automation), (0.2, raw.get("gdpPdfAllPass")),
    )
    science_index = weighted_category((0.6, terminal_science), (0.4, critpt_hard))
    general_index = weighted_category(
        (0.4, omniscience_accuracy),
        (0.2, 1 - omniscience_hallucination if omniscience_hallucination is not None else None),
        (0.4, hle_diamond),
    )

    agentic_index = raw.get("agenticIndex", raw.get("agentic_index"))
    if agentic_index is None:
        gdpval_n = raw.get("gdpvalNormalized")
        if gdpval_n is None:
            gdpval_n = _elo_to_unit(gdpval)
        if briefcase_n is not None and gdpval_n is not None and automation is not None:
            agentic_index = (
                0.5 * briefcase_n + (1.0 / 3.0) * float(gdpval_n) + (1.0 / 6.0) * float(automation)
            ) * 100

    return {
        "id": slug,
        "name": name,
        "shortName": DISPLAY_NAMES.get(slug, raw.get("shortName", raw.get("short_name")) or name),
        "provider": creator_name,
        "intelligenceIndex": float(intelligence) if intelligence is not None else None,
        "codingIndex": coding_index,
        "knowledgeWorkIndex": knowledge_work_index,
        "scienceIndex": science_index,
        "generalIndex": general_index,
        "agenticIndex": agentic_index,
        "mathIndex": raw.get("mathIndex", raw.get("math_index")),
        "inputPrice": float(input_price) if input_price is not None else None,
        "outputPrice": float(output_price) if output_price is not None else None,
        "cacheInputPrice": float(cache_hit_price) if cache_hit_price is not None else None,
        "blendedPrice": float(blended_price) if blended_price is not None else None,
        "costToRunIndex": float(total_cost) if total_cost is not None else None,
        "costPerTask": float(cost_per_task) if cost_per_task is not None else None,
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
        "scicode": scicode,
        "mmluPro": raw.get("mmluPro", raw.get("mmlu_pro")),
        "math500": raw.get("math500", raw.get("math_500")),
        "hle": raw.get("hle"),
        "gdpval": gdpval,
        "gdpvalNormalized": raw.get("gdpvalNormalized"),
        "ifbench": raw.get("ifbench"),
        "tau2": raw.get("tau2"),
        "terminalbenchHard": raw.get("terminalbenchHard", raw.get("terminalbench_hard")),
        "critpt": raw.get("critpt"),
        "mmmuPro": raw.get("mmmuPro", raw.get("mmmu_pro")),
        "multilingualAA": raw.get("multilingualAA", raw.get("multilingual_aa")),
        "omniscience": raw.get("omniscience"),
        "omniscienceAccuracy": omniscience_accuracy,
        "omniscienceHallucinationRate": omniscience_hallucination,
        "lcr": raw.get("lcr"),
        # Intelligence Index v4.1 leftovers (still shipped; no longer in the index)
        "tauBanking": raw.get("tauBanking"),
        "terminalbenchV21": tb21,
        # Intelligence Index v4.3 + standalone agentic benchmarks
        "terminalbenchV40": tb40,
        "frontierCode20": frontier_code,
        "terminalbenchScience": terminal_science,
        "hleDiamond": hle_diamond,
        "critptV2Hard": critpt_hard,
        "gdpPdfAllPass": raw.get("gdpPdfAllPass"),
        "mlcrOverall": raw.get("mlcrOverall"),
        "analystAgent": raw.get("analystAgent"),
        "automationBench": automation,
        "enterpriseOpsGym": raw.get("enterpriseOpsGym"),
        "harveyLabAllPass": raw.get("harveyLab", raw.get("harveyLabAllPass")),
        "apexAgents": raw.get("apexAgents"),
        "itBenchSre": raw.get("itBenchSre"),
        "briefcaseElo": briefcase_elo,
        "code2videoElo": raw.get("code2videoElo", raw.get("code2video_elo")),
        "code2videoEloInterval": raw.get("code2videoEloInterval"),
        "code2videoCostToRun": None,
        "code2videoCostPerTask": None,
        "intelligenceIndexIsEstimated": raw.get("intelligenceIndexIsEstimated"),
    }


def _extract_from_initial_models(text: str, slug: str) -> dict | None:
    """Extract the model object from AA's ``"initialModels":[{...}]`` array
    (Oct 2026 payload; replaced the old ``"currentModel"`` object).
    Returns the array element whose ``slug`` matches, preferring one with a
    non-null intelligence index. Returns None if no match."""
    matches = []
    for rows in _property_values(text, "initialModels"):
        if isinstance(rows, list):
            matches.extend(row for row in rows if _is_full_model(row, slug))
    if not matches:
        return None
    # Prefer an element that actually has benchmark data
    for el in matches:
        if el.get("intelligenceIndex") is not None or el.get("intelligence_index") is not None:
            return el
    return matches[0]


def _extract_model_legacy(text: str, slug: str) -> dict | None:
    """Legacy extractor: find intelligence_index, then search backwards for
    the { that starts the full model object (pre-Oct-2026 ``currentModel``
    payloads). Kept as a fallback."""
    import json as _json

    # Some current pages use reference-only initialModels arrays alongside a
    # full currentModel. Decode that directly before the historical fallback.
    for raw in _property_values(text, "currentModel"):
        if _is_full_model(raw, slug):
            return raw

    intel_pos = text.find('"intelligenceIndex"')
    if intel_pos < 0:
        intel_pos = text.find('"intelligence_index"')
    if intel_pos < 0:
        return None
    # Search backwards from intelligence_index, up to 50KB
    # (must be large enough to find the { that opens the model object
    # — for some models it's 10-15KB before the intelligence_index field)
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
        # Verify this object contains our slug AND intelligenceIndex
        # (the RSC may have smaller nested objects with just the slug,
        # e.g. {"slug":"...","name":"..."} release-info wrappers)
        if f'"slug":"{slug}"' not in obj_str:
            continue
        if '"intelligenceIndex"' not in obj_str and '"intelligence_index"' not in obj_str:
            continue
        # Found it!
        try:
            raw = _json.loads(obj_str)
            if _is_full_model(raw, slug):
                return raw
        except Exception:
            continue
    return None


def fetch_and_clean(url: str) -> list[dict]:
    """Fetch models from the page and clean them."""
    from playwright.sync_api import sync_playwright

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
        for slug in sorted(target_slugs):
            rsc_url = f"https://artificialanalysis.ai/models/{slug}?_rsc=1"
            try:
                resp = page.context.request.get(rsc_url, headers={"RSC": "1"})
                if resp.status != 200:
                    fetch_failures[slug] = f"HTTP {resp.status}"
                    continue
                text = resp.text()
                # Primary: parse the "initialModels" array (Oct 2026 payload).
                # Fallback: legacy backwards search (pre-Oct-2026 payloads).
                best_obj = _extract_from_initial_models(text, slug)
                if best_obj is None:
                    best_obj = _extract_model_legacy(text, slug)
                if best_obj is not None:
                    validate_source_model(best_obj, slug, text)
                    raw_models.append(best_obj)
                else:
                    fetch_failures[slug] = "no model object found (initialModels + legacy)"
            except Exception as e:
                fetch_failures[slug] = f"exception: {e}"
                continue

        if fetch_failures:
            log(f"  Fetch failures ({len(fetch_failures)}):")
            for slug, reason in fetch_failures.items():
                log(f"    {slug}: {reason}")

        log(f"Fetched {len(raw_models)} models via RSC")
        resp = page.context.request.get(f"{CODE2VIDEO_URL}?_rsc=1", headers={"RSC": "1"})
        if resp.status != 200:
            raise RuntimeError(f"Code2Video-AA fetch failed: HTTP {resp.status}")
        evaluation_models = extract_code2video_models(resp.text())
        log(f"Fetched {len(evaluation_models)} Code2Video-AA evaluation rows")
        browser.close()

    # Clean all models
    cleaned = []
    seen_ids = set()
    for raw in raw_models:
        model = clean_model(raw)
        if model and model["id"] not in seen_ids:
            seen_ids.add(model["id"])
            cleaned.append(model)

    enrich_code2video(cleaned, evaluation_models)
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
    ranked.sort(key=lambda m: (-m["intelligenceIndex"], m["id"]))

    for i, model in enumerate(ranked, 1):
        model["intelligenceRank"] = i

    # Append unranked models (e.g., brand-new launches without AA benchmarks yet)
    unranked = [m for m in models if m.get("intelligenceIndex") is None]
    unranked.sort(key=lambda m: m["id"])
    for model in unranked:
        model.pop("intelligenceRank", None)

    return ranked + unranked


def write_output(models: list[dict]) -> None:
    """Write the cleaned data to JSON."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "lastUpdated": datetime.now().isoformat(),
        "sourceUrl": TARGET_URL,
        "modelCount": len(models),
        "intelligenceIndexVersion": INTELLIGENCE_INDEX_VERSION,
        "metricVersions": METRIC_VERSIONS,
        "code2video": {
            "sourceUrl": CODE2VIDEO_URL,
            "taskCount": CODE2VIDEO_TASK_COUNT,
            "costMethod": "Local estimate from AA canonical uncached contestant tokens and API prices; excludes judging and rendering",
        },
        "models": models,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    log(f"Wrote {len(models)} models to {OUTPUT_FILE}")


def validate_models(models: list[dict]) -> tuple[bool, str]:
    """Validate every target before writing; score coverage may legitimately fall."""
    if len(models) < MIN_MODELS:
        return False, f"Only {len(models)} models found (min {MIN_MODELS})"
    ids = [m.get("id") for m in models]
    expected = get_filtered_slugs(TARGET_URL)
    if len(set(ids)) != len(ids) or set(ids) != expected:
        return False, f"Incomplete/duplicate model IDs; missing={sorted(expected - set(ids))}"
    required = {
        "id", "name", "shortName", "provider", "intelligenceIndex", "contextWindow",
        "inputPrice", "outputPrice", "blendedPrice", "costToRunIndex", "costPerTask",
        "codingIndex", "knowledgeWorkIndex", "scienceIndex", "generalIndex", "agenticIndex",
        "frontierCode20", "terminalbenchV40", "terminalbenchScience", "hleDiamond",
        "critptV2Hard", "omniscienceAccuracy", "omniscienceHallucinationRate",
        "code2videoElo", "code2videoEloInterval", "code2videoCostToRun", "code2videoCostPerTask",
    }

    def finite(value):
        if isinstance(value, dict):
            return all(finite(v) for v in value.values())
        if isinstance(value, list):
            return all(finite(v) for v in value)
        return type(value) not in (int, float) or math.isfinite(value)

    for model in models:
        if required - model.keys():
            return False, f"Missing schema fields for {model['id']}: {sorted(required - model.keys())}"
        if not all(model.get(k) for k in ("name", "shortName", "provider", "contextWindow")):
            return False, f"Incomplete metadata for {model['id']}"
        if not finite(model):
            return False, f"Non-finite data for {model['id']}"
        for key in ("codingIndex", "knowledgeWorkIndex", "scienceIndex", "generalIndex"):
            if model[key] is not None and not 0 <= model[key] <= 100:
                return False, f"Invalid {key} for {model['id']}"
    ranked = [m for m in models if m["intelligenceIndex"] is not None]
    unranked = [m for m in models if m["intelligenceIndex"] is None]
    if not ranked or models != ranked + unranked:
        return False, "Missing ranked models or unranked rows are not last"
    if [m["intelligenceIndex"] for m in ranked] != sorted((m["intelligenceIndex"] for m in ranked), reverse=True):
        return False, "Models are not sorted by intelligence"
    if ([m.get("intelligenceRank") for m in ranked] != list(range(1, len(ranked) + 1))
            or any("intelligenceRank" in m for m in unranked)):
        return False, "Invalid ranks"
    if not any(m["inputPrice"] is not None or m["costToRunIndex"] is not None for m in models):
        return False, "No models have price or cost data"
    return True, ""


def validate_output() -> tuple[bool, str]:
    """Recheck the written data and its explicit methodology metadata."""
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        models = data.get("models", [])
        valid, reason = validate_models(models)
        if not valid:
            return valid, reason
        if (data.get("modelCount") != len(models)
                or data.get("intelligenceIndexVersion") != INTELLIGENCE_INDEX_VERSION
                or data.get("metricVersions") != METRIC_VERSIONS):
            return False, "Invalid model count or methodology metadata"

        # Check that we have price or cost data for at least some models
        with_price = sum(1 for m in models if m.get("inputPrice") is not None)
        with_cost = sum(1 for m in models if m.get("costToRunIndex") is not None)
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

    # Completeness guard (Oct 2026): refuse to overwrite the data file with
    # a partial fetch (e.g. after an AA payload format change). Tolerates a
    # few legitimately missing slugs (retired models, transient 404s).
    expected = len(get_filtered_slugs(TARGET_URL))
    if expected and len(models) < 0.9 * expected:
        log(f"ERROR: Only {len(models)}/{expected} models fetched (<90%) — refusing to write (stale file preserved)")
        return 1

    models = compute_ranks(models)
    is_valid, reason = validate_models(models)
    if not is_valid:
        log(f"VALIDATION FAILED before writing: {reason} (existing file preserved)")
        return 1
    write_output(models)

    is_valid, reason = validate_output()
    if not is_valid:
        log(f"VALIDATION FAILED: {reason}")
        return 1

    log("Sync complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
