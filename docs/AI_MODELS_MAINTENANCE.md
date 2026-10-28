# Maintaining the AI model benchmarks

**Agent handoff — last reviewed October 28, 2026.** Read this before adding models, changing default visibility, or repairing an Artificial Analysis (AA) sync. This guide is tracked in Git and does not require previous chat history. Local `AGENTS.md` is gitignored and is not available in a fresh clone.

## Source of truth and files

Read the current files rather than carrying model counts, rankings, or filter versions forward from an old session:

| File | Purpose |
| --- | --- |
| [`scripts/sync-ai-models.py`](../scripts/sync-ai-models.py) | `TARGET_URL` selects slugs; `DISPLAY_NAMES` overrides labels; extractors, `clean_model`, ranking, and sync guards live here. |
| [`src/data/ai-models.json`](../src/data/ai-models.json) | Generated data, including `modelCount`, `lastUpdated`, and all tracked models. Do not hand-enter scores. |
| [`src/app/agentic-ai/page.tsx`](../src/app/agentic-ai/page.tsx) | `DEFAULT_HIDDEN_IDS`, `FILTER_VERSION`, `METRICS`, and a provider color palette for the documentation/bar charts. |
| [`src/components/ModelBenchmarkChart.tsx`](../src/components/ModelBenchmarkChart.tsx) | `AIModel` interface, scatter plots, cost modes, and a **separate** provider color palette. |
| [`src/lib/ai-model-costs.ts`](../src/lib/ai-model-costs.ts) | Shared cost-field selection and scope labels; Code2Video must never inherit Intelligence Index costs. |
| [`scripts/test_sync_ai_models.py`](../scripts/test_sync_ai_models.py), [`scripts/test-ai-model-costs.mjs`](../scripts/test-ai-model-costs.mjs) | Offline category/parser/validation and chart-cost regression tests. |
| [Metrics reference](../src/data/ai-models-metrics-documentation.md) | Definitions, local composite formulas, historical methodology changes, and sync date/count. |
| [`next.config.ts`](../next.config.ts) | Static export and `/personal_webpage` base path. |

Routine model additions usually change the sync script, generated JSON, and metrics-reference header. Visibility changes also affect `page.tsx`; a new provider may need both color palettes updated. Do not change unrelated publications, CV, or GitHub data.

### Current methodology: Intelligence Index v5.0

The October 28 migration was explicitly approved alongside Gemini 4 Carbon (high, default-visible) and the standalone Code2Video-AA metric. The overall score is AA's published **v5** `intelligenceIndex`, not a local recomputation. The four current menu categories (Coding, Knowledge Work, Science, General) are **locally derived** v5 reconstructions; the legacy `agenticIndex` key remains in JSON but is not a current menu option. Read `intelligenceIndexVersion` / `metricVersions` in the JSON and the [v5 metrics reference](../src/data/ai-models-metrics-documentation.md#intelligence-index-v5-october-2026).

v5 coverage is smaller than v4.3: many retained models have no current overall score or evaluation cost. Preserve these as `null` and leave them unranked. **Never backfill v5 scores, Omniscience v1.1 results, or costs with v4.3 data.** Existing model visibility defaults were preserved; adding Carbon did not bump the filter version. No Progress Index or historical comparison was added.

## 1. Check the checkout and environment

Run commands from the repository root. Inspect `git status --short --branch` first. Work normally targets `main`; if the checkout differs or contains existing work, investigate before editing. Never reset, discard, or overwrite someone else's changes. In particular, do not run a full sync over unexplained changes to `ai-models.json`.

Requirements:

- Node.js **20.9+** for the current Next.js version; use the npm lockfile.
- Python **3.10+**, Playwright, and its Chromium browser.
- Network access to AA; the current benchmark sync does not require an AA API key.

If dependencies are already available, reuse them. For a new environment:

```bash
npm ci
python3 -m venv "$HOME/.venvs/personal-webpage-ai"
source "$HOME/.venvs/personal-webpage-ai/bin/activate"
python3 -m pip install playwright
python3 -m playwright install chromium
```

Activate the environment again in subsequent shell calls, or invoke its Python by absolute path. `requirements.txt` currently installs `scholarly`, **not Playwright**. Installing it alone is not sufficient for this task. Prefer `python3`; a `python` executable is not guaranteed.

Do not substitute `scripts/update-all.py`: that script syncs Scholar/GitHub data and can commit/push automatically; it is not the AI-model workflow.

## 2. Research the requested model and variants

1. Inspect the exact requested AA URL, its full model data, and any release/effort selector. A base slug can mean max, high, or xhigh; do not assume it needs a `-max` suffix. Some models have no effort variants.
2. Check the variants actually offered by AA. Probing likely `-xhigh`, `-high`, `-medium`, `-low`, or `-non-reasoning` URLs is useful, but an HTTP 200 alone does not prove that a page has the requested model's data. Inspect the exact slug and label. A 404 only describes that URL at the time of the check, not whether a model exists anywhere.
3. Record the provider, release date, intelligence score, estimated-score flag, context, weights availability, input/output/cache/blended prices, total evaluation cost, and cost per task. Check the fields needed for derived indices. Do not assume a successor is open weights because its predecessor was.
4. Use a **full model object**, not a release/family summary. Missing speed measurements do not imply missing evaluations. If the HTML layout is unfamiliar, inspect its RSC response and both supported object layouts before concluding the data is unavailable.
5. Project ranks against the current JSON, ignoring null intelligence values. State that these are ranks within our selected model set, not AA's entire leaderboard, and can change during the full refresh. Never compare scores across different Intelligence Index versions as if the scales were unchanged.
6. Follow the user's instructions about variants and visibility. Recent families commonly use max-only defaults, but there are explicit exceptions; do not bulk-normalize older families or hide predecessors without approval.

### Read-only probe using the existing parser

Replace `new-model-slug` below. This fetches one RSC response and prints the cleaned model without syncing or writing the JSON:

```bash
python3 -B - new-model-slug <<'PY'
import importlib.util
import json
import subprocess
import sys

spec = importlib.util.spec_from_file_location("ai_sync", "scripts/sync-ai-models.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
slug = sys.argv[1]
response = subprocess.run(
    ["curl", "--silent", "--show-error", "--fail", "--location",
     "--max-time", "60", "-A", "Mozilla/5.0", "-H", "RSC: 1",
     f"https://artificialanalysis.ai/models/{slug}?_rsc=1"],
    check=True, capture_output=True, text=True,
)
raw = sync._extract_from_initial_models(response.stdout, slug)
if raw is None:
    raw = sync._extract_model_legacy(response.stdout, slug)
if raw is None or raw.get("slug") != slug or not any(
    key in raw for key in ("contextWindowTokens", "context_window_tokens")
):
    raise SystemExit("No full matching model object; inspect the response/layout.")
model = sync.clean_model(raw)
if model is None:
    raise SystemExit("Model could not be cleaned; inspect the raw fields.")
print(json.dumps(model, indent=2, ensure_ascii=False))
PY
```

If a request is blocked, times out, or fails to parse, inspect the actual failure. Do not turn a network/parser error into a claim that the model has no benchmarks. Debug fixtures belong in the harness-provided temporary directory, not the repository.

## 3. Configure the addition and default visibility

### Slugs, labels, and providers

- Add each approved slug to the appropriate group in `TARGET_URL`. Keep existing slugs unless their removal was explicitly approved. Avoid duplicate or empty entries.
- Add a `DISPLAY_NAMES` override only if the source label needs it; preserve useful effort/fallback distinctions.
- Preserve AA's exact creator name. Provider names can change (for example, `SpaceXAI` versus `xAI`); a familiar brand does not guarantee an exact palette match.
- Check **both** `PROVIDER_COLORS` maps in `page.tsx` and `ModelBenchmarkChart.tsx`. Add a consistent color to both if needed. The palettes are independent and unknown names fall back to gray.

### Visibility rules

- A new ID not in `DEFAULT_HIDDEN_IDS` is visible by default; an existing user's saved selection can override visibility.
- To hide an effort variant, keep it in `TARGET_URL` and the JSON, add its ID to `DEFAULT_HIDDEN_IDS`, and increment the **current** `FILTER_VERSION`. Do not hardcode a version from this guide or an earlier conversation.
- An addition that is entirely default-visible does not need a version bump.
- Hidden models remain selectable through the Models panel. Charts and metric availability use `activeModels`; **Recent Releases intentionally uses the full model set**, including hidden models.

### Important localStorage migration limitation

The browser stores `filterVersion` and `hiddenModelIds`. On a matching version it loads the saved hidden set. On a version mismatch it takes the **union of the saved hidden IDs and all current default-hidden IDs**.

Consequences:

- New default-hidden IDs are applied to returning users, and previously saved hidden IDs remain hidden.
- A model previously enabled by a user can become hidden again if it is still in the default-hidden set when the version changes.
- **Removing an ID from the defaults does not unhide it for a returning user whose saved set contains it.** Bumping the version does not fix this.

Do not claim that the migration preserves every toggle or automatically applies default-unhide changes to existing users. If the user requires a forced/default-aware migration, agree on that policy and implement/test it as a separate code change. Do not erase user preferences to make a screenshot pass. Test fresh defaults in a private browser session, and test saved selections separately.

## 4. Run the sync, then validate the whole dataset

```bash
python3 scripts/sync-ai-models.py
```

Keep the real command exit status and inspect fetch-failure output. Do not hide failures behind `| tail` unless pipe-failure handling is enabled. The sync refreshes **every target**, not just the newly added model; old scores, names, rankings, pricing, and availability may change.

Before committing:

- All expected slugs must be present exactly once and all previously tracked models must be retained, except explicitly approved retirements.
- Check the new model's source identity, provider, effort, release date, weights flag, context, prices, and benchmark values.
- Verify ranks, model count, and the requested default-visible set; avoid silently changing existing filters.
- Compare non-null coverage before and after, especially prices, intelligence, and derived indices. A complete model count does not prove that every row contains full metadata.
- Investigate coverage losses against AA's **full** HTML/RSC model objects. AA can legitimately withdraw prices or costs for deprecated models; record verified losses rather than filling them with stale values or zeros. The October 23 refresh, for example, confirmed missing Gemini 3.7 medium/low prices and high-effort evaluation costs in both live sources.
- Missing values remain `null`. A real benchmark zero is not the same as missing data. Models with null intelligence are retained but unranked. Scatter plots require a metric and a non-null/nonzero value for the selected cost basis; a model without pricing can still appear in bar rankings.

**Guards:** The original 90% fetched-row backstop remains. `validate_models()` additionally requires **every target exactly once**, complete per-row schema/metadata, finite values, valid category ranges, and correct rank ordering **before writing**. `validate_output()` repeats those checks and verifies methodology metadata after the write. Fetching all rows does not imply benchmark coverage: null v5 scores are valid when verified against AA. The source guard checks the live v5 label and, when populated, the exact nine evaluation slugs. Empty source evaluation-cost arrays can coexist with valid scores. Do not weaken these checks or commit an unexplained coverage loss.

Update the metrics reference's `Last Updated` from the JSON's sync date and `Models Tracked` from the actual count before running the check below. Do not change the reported sync date for a documentation-only edit.

### Reusable pre-commit validation

Run **before committing**, while `HEAD` still identifies the pre-sync baseline. Replace `new-model-slug` with all approved new slugs, separated by spaces. For a filter-only change, pass no slugs. The example deliberately allows no removals; handle approved retirements with an explicit review, not by deleting assertions. If `HEAD` moved after the baseline was recorded, set `AI_MODELS_BASELINE` to that original commit.

```bash
python3 -B - new-model-slug <<'PY'
import ast
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import parse_qs, urlparse

data_path = "src/data/ai-models.json"
baseline = os.environ.get("AI_MODELS_BASELINE", "HEAD")
before = json.loads(subprocess.check_output(
    ["git", "show", f"{baseline}:{data_path}"], text=True,
))
after = json.loads(Path(data_path).read_text())
tree = ast.parse(Path("scripts/sync-ai-models.py").read_text())
target_url = next(
    ast.literal_eval(node.value) for node in tree.body
    if isinstance(node, ast.Assign)
    and any(isinstance(t, ast.Name) and t.id == "TARGET_URL" for t in node.targets)
)
slugs = parse_qs(urlparse(target_url).query)["models"][0].split(",")
assert all(slugs) and len(slugs) == len(set(slugs)), "Duplicate/empty target slug"
rows = after["models"]
models = {m["id"]: m for m in rows}
old = {m["id"]: m for m in before["models"]}
added = set(sys.argv[1:])
assert len(added) == len(sys.argv[1:]), "Duplicate addition argument"
assert after["modelCount"] == len(rows) == len(models) == len(slugs)
assert set(models) == set(slugs), "Output IDs do not match TARGET_URL"
assert not set(old) - set(models), "Previously tracked models disappeared"
assert set(models) - set(old) == added, "Unexpected/missing additions"
assert after["sourceUrl"] == target_url
required = {"id", "name", "shortName", "provider", "intelligenceIndex",
            "inputPrice", "outputPrice", "blendedPrice", "costToRunIndex",
            "costPerTask", "codingIndex", "knowledgeWorkIndex", "scienceIndex",
            "generalIndex", "agenticIndex", "frontierCode20", "terminalbenchScience",
            "hleDiamond", "critptV2Hard", "omniscienceAccuracy",
            "omniscienceHallucinationRate", "code2videoElo", "code2videoEloInterval",
            "code2videoCostToRun", "code2videoCostPerTask", "url"}
assert after["intelligenceIndexVersion"] == "5.0"
for m in rows:
    assert required <= m.keys(), f"Missing schema fields: {m['id']}"
    assert m["name"] and m["shortName"] and m["provider"]
    for value in m.values():
        if type(value) in (int, float):
            assert math.isfinite(value), f"Non-finite number: {m['id']}"
    score = m["intelligenceIndex"]
    assert score is None or type(score) in (int, float)
ranked = [m for m in rows if m["intelligenceIndex"] is not None]
unranked = [m for m in rows if m["intelligenceIndex"] is None]
assert rows == ranked + unranked, "Unranked models must follow ranked models"
assert [m["intelligenceIndex"] for m in ranked] == sorted(
    (m["intelligenceIndex"] for m in ranked), reverse=True,
)
assert [m.get("intelligenceRank") for m in ranked] == list(range(1, len(ranked) + 1))
page = Path("src/app/agentic-ai/page.tsx").read_text()
block = page.split("const DEFAULT_HIDDEN_IDS", 1)[1].split("]);", 1)[0]
hidden = set(re.findall(r'"([^\"]+)"', block))
assert hidden <= set(models), "Default-hidden IDs missing from dataset"
version = re.search(r"const FILTER_VERSION\s*=\s*(\d+)", page).group(1)
doc = Path("src/data/ai-models-metrics-documentation.md").read_text()
assert f"**Models Tracked:** {len(rows)} leading LLMs" in doc
assert f"**Last Updated:** {after['lastUpdated'][:10]}" in doc
print(f"PASS structural checks: {len(rows)} models; filter version {version}; "
      f"{len(rows) - len(hidden)} default-visible.")
for slug in sorted(added):
    m = models[slug]
    print(json.dumps({k: m.get(k) for k in (
        "id", "shortName", "provider", "intelligenceIndex", "intelligenceRank",
        "releaseDate", "contextWindow", "isOpenWeights", "inputPrice",
        "outputPrice", "blendedPrice", "costToRunIndex", "costPerTask",
        "codingIndex", "knowledgeWorkIndex", "scienceIndex", "generalIndex",
        "code2videoElo", "intelligenceIndexIsEstimated",
    )}, indent=2))
    print("Default hidden:", slug in hidden)
print("REVIEW coverage changes against AA before committing:")
for key in ("inputPrice", "blendedPrice", "costToRunIndex", "costPerTask",
            "intelligenceIndex", "codingIndex", "knowledgeWorkIndex", "scienceIndex",
            "generalIndex", "agenticIndex", "code2videoElo", "code2videoCostPerTask"):
    lost = sorted(s for s in old if old[s].get(key) is not None
                  and models[s].get(key) is None)
    restored = sorted(s for s in old if old[s].get(key) is None
                      and models[s].get(key) is not None)
    print(f"{key}: {sum(m.get(key) is not None for m in old.values())} -> "
          f"{sum(m.get(key) is not None for m in rows)}; "
          f"lost={lost}; restored={restored}")
PY
```

This verifies structure, not source accuracy or the user's intended visibility. Review the printed values and hidden/visible decisions yourself. The two color palettes also need a direct check.

## 5. Build and review the page

```bash
python3 -B -m unittest discover -s scripts -p 'test_*.py'
node --experimental-strip-types --test scripts/test-ai-model-costs.mjs
npm run build
```

The JavaScript cost tests use Node's built-in TypeScript stripping (Node 22.18+; the maintainer currently uses Node 25). They require no new npm packages. Python unit tests do not require Playwright; actual syncs still do.

This must complete successfully, including TypeScript and static export. A model's presence in exported HTML alone does not prove that browser-saved filters will show it; inspect the Models panel and the relevant chart/cost modes as needed.

Test both fresh defaults and a browser context preloaded with `filterVersion` / `hiddenModelIds`. Persistence must wait until the saved selection has loaded; otherwise the initial empty set can overwrite saved choices, particularly with development Strict Mode. Do not clear a real user's localStorage. Verify missing-score versus missing-cost empty states, score-only rankings, all four categories, and Code2Video's **own** cost modes.

For interactive checks, use `npm run dev` and open **http://localhost:3000/personal_webpage/agentic-ai**. Internal Next.js links handle the base path; static asset/download paths must include `/personal_webpage`.

The OneDrive checkout can occasionally time out reading generated files. Do not routinely delete directories. If the failure is actually a stale/generated-artifact issue, confirm `.next` and `out` are generated and contain no user work, then clean only those exact paths and retry. Do not treat Recharts' static-prerender size warning as proof of a missing model; distinguish warnings from a failed build and verify runtime charts if needed.

For new benchmark metrics, also follow the [metrics-reference checklist](../src/data/ai-models-metrics-documentation.md#how-to-add-new-benchmark-metrics). Do not add new metrics, redefine composites, or upgrade methodology merely because AA exposes new fields during a routine model addition.

## 6. Commit and deploy the approved changes

Review `git diff` and stage explicit paths, not `git add .`. Routine additions typically include:

```bash
git add scripts/sync-ai-models.py src/data/ai-models.json src/data/ai-models-metrics-documentation.md
```

Include `src/app/agentic-ai/page.tsx` if filters changed, and both chart files if provider palettes changed. Stage documentation-only handoffs separately from model/data changes.

The maintainer's checkout has a pre-commit hook that copies the latest local CV into `public/cv.pdf` and stages it. Hooks are not inherited by a fresh clone. Review the resulting commit and report unexpected changes; do not bypass the hook or discard someone else's CV work.

When implementation and publishing are approved:

```bash
git commit -m "Add requested AI models"
git pull --rebase
git push
git status --short --branch
```

**Never force-push**, including `--force-with-lease`. If a rebase conflicts or a concurrent data update changes the model set, stop, inspect, and revalidate instead of overwriting either side. Rebuild if rebasing changed code or generated data. A push to `main` triggers `.github/workflows/deploy.yml`; pushing successfully is not itself verification that the deployment completed.

Report the actual commit, push/build status, model count, requested visibility, and notable source-data gaps. Avoid hardcoded claims that a provider/model is the cheapest, newest, or highest-scoring without checking the relevant dataset.

## Parser and metric details to preserve

- **July 2026:** snake_case fields moved to camelCase, creator lists to a single `creator` object, and evaluation cost `total_cost` to `total`. Keep compatibility reads in `clean_model`.
- **October 2026:** pages can contain `initialModels[]` or legacy `currentModel` data. The script tries `_extract_from_initial_models` first, then `_extract_model_legacy`. Nested release summaries also carry slugs/intelligence; they are not full model rows. Payload-size/search limits and layout changes can cause parser failures even when the page has evaluations.
- Raw `terminalBench21` and `terminalBench40` are accepted alongside `terminalbenchV21/V40` and older snake_case fields. Generated JSON retains `terminalbenchV21/V40`. v5 explicitly adds `terminalBenchScience` → `terminalbenchScience`, `frontierCode20`, `hleDiamond`, and `critptAgenticHard` → `critptV2Hard`. These are separate benchmarks, not aliases for older ones.
- Coding is now `(0.6 * frontierCode20 + 0.4 * terminalbenchV40) * 100`. Never fall back to FrontierCode 1.1, SciCode, or an unversioned source composite. Knowledge Work is `(0.6 * briefcaseNorm + 0.2 * automationBench + 0.2 * gdpPdfAllPass) * 100`; Science is `(0.6 * terminalbenchScience + 0.4 * critptV2Hard) * 100`; General is `(0.4 * omniscienceAccuracy + 0.2 * (1 - omniscienceHallucinationRate) + 0.4 * hleDiamond) * 100`. Every component is required, while real zeros remain valid.
- The legacy `agenticIndex` formula remains `(0.5 * briefcaseNorm + 1/3 * gdpvalNorm + 1/6 * automationBench) * 100` for compatibility only. Elo normalization is clamped to `[0, 1]` using `(Elo - 500) / 2000`; legacy GDPval uses `gdpvalNormalized` when present. Current Knowledge Work uses the live Briefcase Elo rather than AA's frozen-at-addition snapshot.
- `omniscience` is now **v1.1**, although AA reused the raw key. Its accuracy and hallucination-rate inputs are extracted separately; do not recreate them from the headline Index or reuse v1 scores.
- `code2videoElo` is a standalone additional metric, not part of v5. Enrich exact slugs from the Code2Video evaluation page's inline `initialModels[]` rows. These contain more precise overall confidence intervals and `canonicalEvalTokenCounts.code2video`. Cost estimates use the known single-call uncached token accounting, API input/output prices, and 114 tasks, exclude judging/rendering, and remain null for missing prices/counts or unsupported caching. If the benchmark's task count/accounting changes, review the estimator before changing `CODE2VIDEO_TASK_COUNT`. `src/lib/ai-model-costs.ts` routes both Code2Video cost modes to its own fields without fallback.
- Local reconstructions are not official published composites. Read the [metrics reference](../src/data/ai-models-metrics-documentation.md) and AA's current methodology before proposing changes to their formulas. Null legacy metrics are not evidence that the overall Intelligence Index is unavailable.
- `costPerTask` comes from `intelligenceIndexCostPerTask.cost.total`: AA's **evaluation-weighted average cost per task**, not the median and not simply total evaluation cost divided by one aggregate task count. UI wording now uses this definition and identifies the full v5 cost scope even when plotting an individual metric.

## Starting a new agent session

A sufficient handoff prompt is:

> Read `docs/AI_MODELS_MAINTENANCE.md` and the current sync/filter files. Research these AA URLs and their actual variants: [URLs]. Show [requested variants] by default. Preserve all existing models and unrelated work. Propose any parser/metric changes before widening scope; validate the full refresh, build, and commit/push only when approved.

The guide and current files are the handoff; do not depend on earlier chat summaries, local-only documentation, or old model/ranking counts.
