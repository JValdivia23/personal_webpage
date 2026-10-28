# AI Model Benchmark Metrics Documentation

**Source:** [Artificial Analysis](https://artificialanalysis.ai)\
**Last Updated:** 2026-10-28\
**Models Tracked:** 129 leading LLMs\
**Intelligence Index Version:** v5.0 (see [v5 migration notes](#intelligence-index-v5-october-2026))

**Agent maintenance:** Start with the tracked [AI Models Maintenance guide](../../docs/AI_MODELS_MAINTENANCE.md) for setup, model additions, variants/defaults, parser troubleshooting, validation, and release instructions. This file is the metric reference, not the full operational checklist.

**Historical samples:** The 38-model ranges and coverage figures retained below are historical samples, not live statistics for the current dataset. Compute current coverage from `ai-models.json`; the page's availability counts use only the currently active models.

---

## Composite Indices (Averages)

The overall Intelligence Index is published by Artificial Analysis. The four category scores below are **locally derived**, not official AA composites or the separate Coding Agent Index. They summarize different capabilities; missing inputs never become zeros or trigger reweighting.

### Artificial Analysis Intelligence Index
- **What it measures:** Overall model intelligence across reasoning, knowledge, maths and programming.
- **Scale:** Higher is better. The scale depends on the evaluation suite; scores from different index versions are not directly comparable. Read current leaders from the JSON rather than a fixed example.
- **How it's calculated:** AA's published score across nine evaluations; four equally weighted categories. We do not reconstruct the overall score from the local categories.
- **Included benchmarks (v5 — October 2026):** AA-Briefcase v1.1, AutomationBench-AA, GDP.pdf, FrontierCode 2.0, Terminal-Bench 4.0, Terminal-Bench-Science 0.1, CritPt v2 hard subset, AA-Omniscience v1.1, HLE-Diamond.
- **Category breakdown:**
  - **Knowledge Work (25%):** AA-Briefcase v1.1 15%, AutomationBench-AA 5%, GDP.pdf 5%
  - **Coding (25%):** FrontierCode 2.0 15%, Terminal-Bench 4.0 10%
  - **Science (25%):** Terminal-Bench-Science 15%, CritPt v2 hard subset 10%
  - **General (25%):** AA-Omniscience v1.1 accuracy 10% + non-hallucination 5%, HLE-Diamond 10%
- **Changes from v4.3:** Removed GDPval-AA, SciCode, and AA-LCR; added FrontierCode 2.0 and Terminal-Bench-Science; upgraded HLE, CritPt, and AA-Omniscience. GDP.pdf's weight changed from 10% to 5%. Scores and evaluation costs are not directly comparable across index versions.
- **Methodology:** 60% of v5 is based on private test sets or held-out answers. The suite is primarily text-based and English-language, but HLE-Diamond includes 272 image questions. Consult the current methodology for each evaluation's tools, harness, and normalization.
- **Why it matters:** The single best metric for comparing overall model capability.
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking

### Coding Index
- **What it measures:** Programming and software development capabilities.
- **Scale:** Higher is better (0–100)
- **How it's calculated:** `(0.6 × frontierCode20 + 0.4 × terminalbenchV40) × 100`.
- **⚠️ Derived field:** `codingIndex` is a local v5 category reconstruction. Both components are required. Never fall back to `frontierCode` (v1.1), SciCode, or an unversioned source composite. The prior v4.3 formula was `(0.5 × terminalbenchV40 + 0.5 × scicode) × 100`; it must not be compared as the same scale.
- **Included benchmarks:** FrontierCode 2.0 (132 private repository tasks, 3 attempts) and Terminal-Bench 4.0 (66 tasks, pass@1 over 3 repeats).
- **Why it matters:** Critical for developers choosing models for code generation, debugging, and software engineering tasks.
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking

### Knowledge Work Index
- **What it measures:** Professional deliverables, SaaS workflows, and reasoning over documents.
- **Field:** `knowledgeWorkIndex`; replaces the old Agentic menu option, not the legacy data key.
- **Formula:** `(0.6 × briefcaseNorm + 0.2 × automationBench + 0.2 × gdpPdfAllPass) × 100`.
- **Normalization:** `briefcaseNorm = clamp((briefcaseElo − 500) / 2000, 0, 1)`. Uses current source Elo, not AA's frozen-at-addition index snapshot. This is a local approximation, not an official category score.
- **Missing inputs:** All three components are required; otherwise `null`.

### Science Index
- **Field:** `scienceIndex`.
- **Formula:** `(0.6 × terminalbenchScience + 0.4 × critptV2Hard) × 100`.
- **Missing inputs:** Both components are required. Legacy CritPt and Terminal-Bench 4.0 are not substitutes.

### General Index
- **Field:** `generalIndex`.
- **Formula:** `(0.4 × omniscienceAccuracy + 0.2 × (1 − omniscienceHallucinationRate) + 0.4 × hleDiamond) × 100`.
- **Missing inputs:** All three v5 inputs are required. The Omniscience headline Index is not a substitute for accuracy and hallucination rate.

### Agentic Index (legacy compatibility field)
- **What it measures:** The model's ability to act as an autonomous agent — planning, tool use, multi-step reasoning, and real-world task completion.
- **Scale:** Higher is better (0–100)
- **Status:** Retained in JSON as `agenticIndex` but no longer offered as a current category in the UI. It uses the legacy v4.3 formula on current source data, not a frozen historical snapshot.
- **How it's calculated:** Weighted reconstruction of Intelligence Index v4.3's Agents category.
- **⚠️ Derived field (v4.3):** AA dropped the standalone `agenticIndex` composite from RSC payloads. This field is **recomputed locally** as `(0.5 × briefcaseNorm + 1/3 × gdpvalNorm + 1/6 × automationBench) × 100`, matching the 15/10/5 index weights. Elo scores use AA's documented mapping `clamp((Elo − 500) / 2000)` (`gdpvalNormalized` is used when present). Requires all three components; otherwise `null`.
- **Included benchmarks:** AA-Briefcase, GDPval-AA v2, AutomationBench-AA.
- **Why it matters:** Important for applications where the model needs to perform complex workflows, use tools, or operate autonomously.
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking

### Math Index (Deprecated)
- **What it measures:** Mathematical reasoning and problem-solving abilities.
- **Scale:** Higher is better
- **Status:** **Deprecated.** As of July 2026, AA's RSC data no longer populates this field. Retained in the schema for backward compatibility but always `null`. Use `aime25` or individual math benchmarks instead.

---

## Intelligence Index v4.3 (September 2026)

**Historical methodology — superseded by v5.** AA launched Intelligence Index v4.3 in early September 2026. The payloads at that time confirmed:

| Change | Detail |
|---|---|
| Index composition | 10 evals; Agents 30% / Coding 20% / General 30% / Sci Reasoning 20% |
| New in index | `terminalbenchV40`, `gdpPdfAllPass`, AA-Briefcase (already tracked as `briefcaseElo`), AutomationBench (already tracked) |
| Dropped from index | τ³-Banking, Terminal-Bench v2.1, GPQA Diamond, IFBench (fields still populated) |
| Removed composites | `agenticIndex` is 0 hits in RSC; reconstructed locally |
| Renamed | `harveyLabAllPass` → `harveyLab` (sync script hybrid-reads both; JSON key stays `harveyLabAllPass`) |
| New additional evals | `mlcrOverall` (MLCR-AA), `analystAgent` (AA-AnalystAgent) |
| Score scale | Frontier scores compressed (~65 → ~53 for Claude Fable 5.1 max) because the suite got harder |

Consult AA's current methodology for index-level Elo freezing and normalization. The local Agentic Index reconstruction does not store frozen Elo snapshots: it uses the current payload's `briefcaseElo`, `gdpvalNormalized` when present (otherwise the Elo mapping), and `automationBench`. It should not be presented as an official published composite.

---

## Intelligence Index v5 (October 2026)

AA launched v5 on October 27. The October 28 refresh retains all existing models and adds only `gemini-4-carbon` (high), default-visible. Of 129 tracked models, 57 have official v5 intelligence scores and 55 have v5 evaluation costs. These are a dated snapshot, not completeness thresholds. The other models remain available for individual evaluations; their missing v5 scores and costs remain `null`, never backfilled from v4.3.

The JSON records `intelligenceIndexVersion` and `metricVersions`. The sync verifies the source's v5 label and, when present, its nine evaluation slugs before accepting a full matching model object. AA sometimes publishes a non-null score with an empty `intelligenceIndexEvaluations` array and missing costs (e.g. Gemini 3.8 Flash low); preserve that source score. No Progress Index or cross-version historical trend is introduced by this migration.

| Source field | Generated field | Meaning |
| --- | --- | --- |
| `frontierCode20` | `frontierCode20` | FrontierCode **2.0**, not `frontierCode` v1.1 |
| `terminalBenchScience` | `terminalbenchScience` | Terminal-Bench-Science 0.1.0, not Terminal-Bench 4.0 |
| `hleDiamond` | `hleDiamond` | Refined 1,000-question exam, not legacy `hle` |
| `critptAgenticHard` | `critptV2Hard` | Private 40-question CritPt v2 subset with Python tools, not legacy `critpt` or the full 70-question v2 score |
| `omniscience` | `omniscience` | **v1.1** headline Index; the upstream field name was reused |
| `omniscienceAccuracy` / `omniscienceHallucinationRate` | same | Separate v1.1 inputs needed for the General reconstruction |

### FrontierCode 2.0
- 132 private open-source repository-change tasks, 3 attempts in Stirrup; failing blocking checks or looking up the solution scores zero, otherwise weighted rubric scoring.
- **Weight:** v5 Coding, 15% overall.
- **Official:** https://artificialanalysis.ai/evaluations/frontiercode-2-0

### Terminal-Bench-Science 0.1.0
- 70 expert-curated research workflows across life (19), physical (17), mathematical (17), engineering (9), and earth sciences (8). mini-swe-agent, up to 1,000 steps, pass@1 over 3 repeats; all verification tests must pass.
- **Weight:** v5 Science, 15% overall.
- **Official:** https://artificialanalysis.ai/evaluations/terminal-bench-science

### HLE-Diamond
- 1,000 questions, evenly split between reasoning and knowledge, including 272 image questions. No tools; pass@1. Not directly comparable to AA's legacy 2,158-question text-only HLE.
- **Weight:** v5 General, 10% overall.
- **Official:** https://artificialanalysis.ai/evaluations/hle-diamond

### CritPt v2 Hard Subset
- A fixed private subset of 40 of the 70 revised physics problems. Offline Python tools in Stirrup, up to 50 turns, pass@1 over 5 repeats; official grading server.
- **Weight:** v5 Science, 10% overall.
- **Official:** https://artificialanalysis.ai/evaluations/critpt-v2?critpt-subset=hard

### Code2Video-AA (standalone)
- **What it measures:** Designing short product/brand videos in HyperFrames HTML and GSAP code, not native video generation.
- 114 briefs (39 public, 75 private), one model call per brief, no tools. Rendered videos are compared by a Gemini 4 Argon judge on engagement, prompt intent, composition, temporal consistency, and craft.
- **Score:** `code2videoElo`, the mean of five axis Elo ratings, anchored to GPT-5.5 (xhigh) at 1000. Higher is better. `code2videoEloInterval` stores the overall 95% comparison-sampling interval, not uncertainty across repeated tasks.
- **Coverage:** 23 selected models have results in the October 28 snapshot; the source leaderboard has 27. We join exact model/effort slugs and do not add unrelated models or copy a family's score to its variants. Missing results remain `null`.
- **Not part of v5:** Does not contribute to overall intelligence or any local category composite.
- **Costs:** `code2videoCostToRun` and `code2videoCostPerTask` are separate **local contestant API cost estimates**, using the evaluation page's `canonicalEvalTokenCounts.code2video` and API prices: `(input × inputPrice + (answer + reasoning) × outputPrice) / 1,000,000`, then divide by 114 for per-task cost. This applies only to the known single-call, uncached accounting (`cacheableInput` is null/zero). Missing counts/prices or unsupported cache accounting produce `null`. Excludes judging and rendering; not an end-to-end video-production price.
- **Charts:** Code2Video uses these costs in both evaluation-cost modes, never Intelligence Index costs. Blended token price remains model-level. Score-only documentation rankings do not require pricing.
- **Official:** https://artificialanalysis.ai/evaluations/code2video-aa

---

## Individual Benchmarks

### GPQA Diamond (Graduate-Level Google-Proof Q&A)
- **What it measures:** The most challenging 198 questions from GPQA, where PhD experts achieve 65% accuracy but skilled non-experts only reach 34% despite web access.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Format:** Multiple-choice questions at PhD level in biology, chemistry, and physics.
- **Background:** These graduate-level questions are designed to be "Google-proof" and require genuine scientific expertise rather than search skills. They can only be consistently solved by domain experts with PhDs, making them ideal for testing true scientific reasoning capabilities.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests deep domain expertise and reasoning in hard sciences. A score above 0.85 indicates strong scientific reasoning.
- **Status:** Intelligence Index through v4.1; **legacy as of v4.3** (field still populated).
- **Official page:** https://artificialanalysis.ai/evaluations/gpqa-diamond
- **Publication:** [GPQA: A Graduate-Level Google-Proof Q&A Benchmark](https://arxiv.org/abs/2311.12022) (David Rein, Betty Li Hou, Asa Cooper Stickland, Jackson Petty, Richard Yuanzhe Pang, Julien Dirani, Julian Michael, Samuel R. Bowman)

### HLE (Humanity's Last Exam)
- **Status:** Legacy, removed from the index in v5; use the separate HLE-Diamond metric for current index results.
- **What it measures:** AA's legacy 2,158-question text-only evaluation drawn from Humanity's Last Exam, across mathematics, sciences, and humanities.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** A collaborative effort by the Center for AI Safety involving over 1,000 contributors to create frontier-level academic questions that challenge current AI capabilities. The questions are designed to be 'Google-proof' and require genuine understanding rather than information retrieval, serving as the intended final closed-ended academic benchmark.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** A difficult frontier benchmark with substantial remaining headroom. Leading scores change over time; do not assume they remain below 0.5.
- **Historical range (38-model sample):** 0.173 — 0.533
- **Official page:** https://artificialanalysis.ai/evaluations/humanitys-last-exam

### SciCode
- **Status:** Removed from the index in v5 and retained as legacy; AA marks it under review. It no longer contributes to `codingIndex`.
- **What it measures:** A scientist-curated coding benchmark featuring 288 test set subproblems from 80 laboratory problems across 16 scientific disciplines.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** Unlike traditional coding benchmarks, SciCode requires integrating scientific knowledge with programming skills to solve real research problems rather than abstract puzzles. The benchmark was developed by domain experts across 16 diverse natural science sub-fields, including mathematics, physics, chemistry, biology, and materials science.
- **Methodology:** Problems naturally factorize into multiple subproblems, each involving knowledge recall, reasoning, and code synthesis. It offers optional descriptions specifying useful scientific background information and scientist-annotated gold-standard solutions and test cases for evaluation. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests the intersection of coding ability and scientific understanding. Important for research automation. Equal-weight Coding component of Intelligence Index v4.3 (10%).
- **Official page:** https://artificialanalysis.ai/evaluations/scicode
- **Publication:** [SciCode: A Research Coding Benchmark Curated by Scientists](https://arxiv.org/abs/2407.13168) (Minyang Tian, Luyu Gao, Shizhuo Dylan Zhang, Xinan Chen, Cunwei Fan, Xuefei Guo, Roland Haas, Pan Ji, Kittithat Krongchon, Yao Li, Shengyan Liu, Di Luo, Yutao Ma, Hao Tong, Kha Trinh, Chenyu Tian, Zihan Wang, Bohao Wu, Yanyu Xiong, Shengzhu Yin, and 10 others)

### GDPval (GDPval-AA Leaderboard)
- **Status:** Standalone in v5. The current v2.1 Elo scale is anchored to DeepSeek V4.1 Flash (max) at 1600 and fitted with Crowd-BT; the original v2 description below is historical. Not part of the Knowledge Work category.
- **What it measures:** Artificial Analysis' evaluation framework for OpenAI's GDPval dataset. Tests AI models on real-world tasks across 44 occupations and 9 major industries. Models are given shell access and web browsing capabilities in an agentic loop via Stirrup to solve tasks.
- **Scale:** ELO rating (higher is better, no fixed upper bound)
- **How it's calculated:** ELO ratings are derived from blind pairwise comparisons of model outputs.
- **Background:** The GDPval gold public dataset includes 220 tasks developed by OpenAI in collaboration with industry professionals to reflect real-world complexity. The benchmark requires models to produce diverse outputs including documents, slides, diagrams, and spreadsheets, mirroring actual work products across finance, healthcare, legal, and other professional domains.
- **Why it matters:** Tests practical, open-ended real-world agentic capabilities beyond traditional academic benchmarks.
- **Historical range (38-model sample):** 689.5 — 1759.6
- **Official page:** https://artificialanalysis.ai/evaluations/gdpval-aa

### Tau-2 (τ²-Bench Telecom)
- **What it measures:** A dual-control conversational AI benchmark simulating technical support scenarios where both agent and user must coordinate actions to resolve telecom service issues.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** 𝜏²-Bench (Tau-2 Bench) introduces a new paradigm for evaluating conversational AI by simulating both the agent and user to actively modify a shared world state. The telecom domain tests agents' abilities to guide users through technical troubleshooting to test problem-solving and effective communication skills. Developed by Sierra Research, this benchmark addresses gaps between other benchmarks and real-world customer service scenarios where users are active participants in problem resolution.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests multi-turn agent coordination and task completion in realistic customer-service dialogues.
- **Historical range (38-model sample):** 0.658 — 0.991
- **Official page:** https://artificialanalysis.ai/evaluations/tau2-bench
- **Publication:** [𝜏²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) (Victor Barres, Honghua Dong, Soham Ray, Xujie Si, Karthik Narasimhan)

### IFBench (Instruction Following Benchmark)
- **What it measures:** A benchmark evaluating precise instruction-following generalization on 58 diverse, verifiable out-of-domain constraints that test models' ability to follow specific output requirements.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** IFBench addresses the problem that current language models strongly overfit to a small set of verifiable constraints and cannot generalize well to unseen output constraints, a critical skill for practical AI applications. The benchmark introduces 58 new, diverse, and challenging verifiable constraints to test precise instruction-following generalization, going beyond existing benchmarks that focus on a limited set of constraint types.
- **Methodology:** Developed by the Allen Institute for AI, IFBench uses reinforcement learning with verifiable rewards (RLVR) to improve instruction following and includes 29 additional hand-annotated training constraints with verification functions. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Critical for real-world applications where precise adherence to instructions is required.
- **Historical range (38-model sample):** 0.531 — 0.829
- **Official page:** https://artificialanalysis.ai/evaluations/ifbench
- **Publication:** [Generalizing Verifiable Instruction Following](https://arxiv.org/abs/2507.02833) (Valentina Pyatkin, Saumya Malik, Victoria Graf, Hamish Ivison, Shengyi Huang, Pradeep Dasigi, Nathan Lambert, Hannaneh Hajishirzi)

### TerminalBench Hard
- **What it measures:** An agentic benchmark evaluating AI capabilities in terminal environments through software engineering, system administration, and data processing tasks.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** Terminal-Bench is a comprehensive benchmark developed by Stanford University and the Laude Institute for evaluating AI agents in realistic terminal environments. The "hard" subset contains challenging tasks that test agents' abilities to compile code, train models, configure servers, play games, and debug systems in representative scenarios for real-world problems and terminal use patterns.
- **Methodology:** Tasks cover a wide range of engineering, game playing, and system administration tasks that are unlikely to be pattern-matched on training data. Outcomes are evaluated programmatically with verification scripts executed in the agent's Docker environment, requiring agents to successfully meet a range of output conditions. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests practical system administration and command-line reasoning abilities.
- **Historical range (38-model sample):** 0.235 — 0.629
- **Official page:** https://artificialanalysis.ai/evaluations/terminalbench-hard

### CritPT (Critical Physics Thinking)
- **Status:** Legacy; distinct from both the full CritPt v2 and its tool-assisted hard subset. Removed from the index in v5.
- **What it measures:** A benchmark designed to test LLMs on research-level physics reasoning tasks, featuring 71 composite research challenges.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** CritPt evaluates language models on solving unpublished, frontier-level physics problems that require genuine research-scale reasoning. The benchmark comprises 71 challenges (70 test challenges and one example), created by over 50 active physics researchers across 30 institutions and spanning 11 physics subfields including condensed matter, quantum physics, astrophysics, high energy physics, and biophysics. Each problem underwent extensive review (averaging 40+ hours per challenge) and uses "guess-resistant" answer formats including floating-point arrays, symbolic expressions, and Python functions.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests advanced scientific reasoning in physics, beyond standard textbook problems. Leading models in 2025 achieve only single-digit accuracy, highlighting the substantial gap between current AI capabilities and research-level physics reasoning.
- **Historical range (38-model sample):** 0.003 — 0.286
- **Official page:** https://artificialanalysis.ai/evaluations/critpt
- **Publication:** [Probing the Critical Point (CritPt) of AI Reasoning: a Frontier Physics Research Benchmark](https://arxiv.org/abs/2509.26574) (Minhui Zhu, Minyang Tian, Xiaocheng Yang, Tianci Zhou, Penghao Zhu, Eli Chertkov, Shengyan Liu, Yufeng Du, Lifan Yuan, Ziming Ji, Indranil Das, Junyi Cao, Jinchen He, Yifan Su, Jiabin Yu, Yikun Jiang, Yujie Zhang, Chang Liu, Ze-Min Huang, Weizhen Jia, and 44 others)

### MMMU Pro (Massive Multi-discipline Multimodal Understanding — Professional)
- **What it measures:** An enhanced MMMU benchmark that eliminates shortcuts and guessing strategies to more rigorously test multimodal models across 30 academic disciplines.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** MMMU-Pro addresses limitations in the original MMMU through a three-step enhancement process: filtering out questions answerable by text-only models, expanding multiple-choice options from 4 to 10, and introducing a vision-only input format where questions are embedded within screenshots or photos. The benchmark contains 3,460 questions across six core disciplines (Art & Design, Business, Science, Health & Medicine, Humanities & Social Science, and Tech & Engineering).
- **Methodology:** Requires models to simultaneously process visual and textual information in a more realistic setting. Performance results show substantial drops across all tested models compared to the original MMMU, demonstrating the benchmark's effectiveness in exposing current limitations in multimodal AI systems. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests vision-language capabilities at expert level. Only available for models with multimodal support.
- **Historical coverage (38-model sample):** 21/38 models (multimodal models only)
- **Historical range (same sample):** 0.687 — 0.843
- **Official page:** https://artificialanalysis.ai/evaluations/mmmu-pro
- **Publication:** [MMMU-Pro: A More Robust Multi-discipline Multimodal Understanding Benchmark](https://arxiv.org/abs/2409.02813) (Xiang Yue, Tianyu Zheng, Yuansheng Ni, Yubo Wang, Kai Zhang, Shengbang Tong, Yuxuan Sun, Botao Yu, Ge Zhang, Huan Sun, Yu Su, Wenhu Chen, Graham Neubig)

### LCR (Long Context Reasoning)
- **Status:** Removed from the index in v5; retained as legacy.
- **What it measures:** Language models' ability to extract, reason about, and synthesize information from long-form documents ranging from 10k to 100k tokens (measured using the cl100k_base tokenizer).
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** Long-form text comprehension represents an under-studied class of evaluations where humans dramatically outscore language models, despite expanding context windows in current AI systems. LCR features 100 questions across diverse document types including academic papers, company financials, government consultations, legal documents, industry reports, and marketing materials, requiring genuine reasoning rather than simple data extraction.
- **Methodology:** Each question demands multi-step reasoning to synthesize information from dispersed sections, understand complex domain-specific content, and produce unambiguous answers that mid-2024 frontier models achieve less than 50% accuracy on. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Critical for applications processing long documents, where the model must find relevant information in extensive text.
- **Historical range (38-model sample):** 0.507 — 0.743
- **Official page:** https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning

### Omniscience v1.1
- **What it measures:** Factual recall and hallucination across various economically relevant domains. AA-Omniscience is a knowledge and hallucination benchmark that rewards accuracy, punishes bad guesses, and provides a comprehensive view of which models produce factually reliable outputs across different domains.
- **Scale:** -100 to 100 (higher is better, can be negative)
- **Background:** v1.1 contains 3,000 questions across 42 topics. Saturated and public v1 questions were removed, new questions added, and ambiguous/erroneous items revised. The upstream `omniscience` key now refers to v1.1; do not backfill missing values with v1 scores. Scores are not directly comparable across these dataset versions.
- **Methodology:** The evaluation measures a model's AA-Omniscience Index, a bounded metric (-100 to 100) measuring factual recall that jointly penalizes hallucinations and rewards abstention when uncertain, with 0 equating to a model that answers questions correctly as much as it does incorrectly. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Indicates the breadth of the model's training knowledge and its tendency to hallucinate. Performance varies by domain, suggesting models should be chosen according to the demands of the use case rather than general performance for tasks where knowledge is important.
- **Historical v1 range (38-model sample, not comparable to v1.1):** -50.1 — 40.2
- **Official page:** https://artificialanalysis.ai/evaluations/omniscience
- **Publication:** [AA-Omniscience: Evaluating Cross-Domain Knowledge Reliability in Large Language Models](https://arxiv.org/abs/2511.13029) (Declan Jackson, William Keating, George Cameron, Micah Hill-Smith)

---

## Sparsely Available Benchmarks

The following benchmarks are only available for a small subset of models:

### AIME25
- **What it measures:** American Invitational Mathematics Examination 2025 problems.
- **Scale:** 0.0 to 1.0
- **Historical coverage (38-model sample):** 3/38 models
- **Historical range (same sample):** 0.880 — 0.934
- **Why it matters:** Competitive math benchmark; olympiad-level mathematical reasoning with integer answers from 000-999.

### LiveCodeBench
- **What it measures:** Live coding competition problems. A contamination-free coding benchmark that continuously harvests fresh competitive programming problems from LeetCode, AtCoder, and CodeForces, evaluating code generation, self-repair, and execution.
- **Scale:** 0.0 to 1.0
- **Historical coverage (38-model sample):** 3/38 models
- **Historical range (same sample):** 0.714 — 0.878
- **Why it matters:** Tests coding under time pressure with fresh, unseen problems.

### Removed / Dead Fields (July 2026)
The following fields are retained in the JSON schema for backward compatibility and were unpopulated in the historical 38-model sample after the camelCase migration. Preserve their keys; inspect the live payload before assuming an evaluation is permanently unavailable:
- **AIME** (`aime`) — replaced by `aime25`
- **HumanEval** (`humaneval`) — no longer in RSC data
- **MMLU Pro** (`mmluPro`) — no longer populated in that payload; `mmmuPro` (MMMU-Pro) is a separate multimodal benchmark, not the same evaluation
- **Math-500** (`math500`) — no longer in RSC data
- **Multilingual AA** (`multilingualAA`) — no longer in RSC data

---

## Continuing Components & Additional Evals

### Terminal-Bench v4.0 (`terminalbenchV40`)
- **What it measures:** 66 terminal-based agentic tasks scored by a test-suite pass/fail (pass@1, 3 repeats).
- **Scale:** 0.0 to 1.0 (accuracy)
- **Part of:** Intelligence Index v5 (Coding, 10%; unchanged from v4.3)
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking#terminal-bench-v4-0

### GDP.pdf (`gdpPdfAllPass`)
- **What it measures:** Free-form answers grounded in a long PDF — 100 tasks across 10 domains, 5 repeats. Headline metric is all-pass rate.
- **Scale:** 0.0 to 1.0 (all-pass)
- **Part of:** Intelligence Index v5 (Knowledge Work, 5%; was General, 10% in v4.3)
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking#gdp-pdf

### MLCR-AA (`mlcrOverall`)
- **What it measures:** Medical long-context reasoning — 60 questions (expert + compound tiers), conciseness gate + 3-judge majority vote, pass@1 over 3 repeats.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Part of:** Additional evaluations (not in the Intelligence Index)
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking#mlcr-aa

### AA-AnalystAgent (`analystAgent`)
- **What it measures:** Agentic Python analysis — 80 tasks across 14 domains, LLM-judge binary correctness with numeric pre-check, pass^5 over 5 repeats.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Part of:** Additional evaluations (not in the Intelligence Index)
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking#aa-analyst-agent

### 𝜏³-Banking (`tauBanking`)
- **What it measures:** A fintech customer-support benchmark from the 𝜏-Knowledge framework that tests whether agents can navigate a large unstructured knowledge base and execute multi-step tool calls to resolve realistic banking workflows.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Status:** Intelligence Index v4.1 Agents component; **legacy / additional as of v4.3** (field still populated).
- **Official page:** https://artificialanalysis.ai/evaluations/tau3-banking

### Terminal-Bench v2.1 (`terminalbenchV21`)
- **What it measures:** A verified refresh of Terminal-Bench v2.0 — 89 curated tasks across software engineering, system administration, data processing, model training, and security.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Status:** Intelligence Index v4.1 Coding component; **superseded in the index by v4.0** as of v4.3 (field still populated).
- **Official page:** https://artificialanalysis.ai/evaluations/terminalbench-v2-1

### AutomationBench-AA (`automationBench`)
- **What it measures:** Agentic task completion across simulated SaaS application environments, scoring the share of each task's objectives completed without guardrail violations. Covers 657 tasks across six business domains (Finance, HR, Marketing, Operations, Sales, Support) using simulated environments for Gmail, Google Sheets, Slack, Salesforce, Zendesk, Jira, and HubSpot.
- **Scale:** 0.0 to 1.0 (share of objectives completed)
- **Historical coverage (38-model sample):** 20/38 models
- **Historical range (same sample):** 0.057 — 0.514
- **Developed by:** Zapier (arXiv: 2604.18934)
- **Part of:** Intelligence Index v5 (Knowledge Work, 5%; was Agents, 5% in v4.3)
- **Official page:** https://artificialanalysis.ai/evaluations/automationbench-aa

### EnterpriseOps-Gym-AA (`enterpriseOpsGym`)
- **What it measures:** Artificial Analysis' independent implementation of ServiceNow's EnterpriseOps-Gym, an agentic benchmark testing whether LLM agents can complete stateful, multi-step enterprise workflows across eight business domains via live tool use, graded on the final state of the underlying databases.
- **Scale:** 0.0 to 1.0 (task completion rate)
- **Historical coverage (38-model sample):** 19/38 models
- **Historical range (same sample):** 0.252 — 0.511
- **Official page:** https://artificialanalysis.ai/evaluations/enterprise-ops-gym-aa

### Harvey LAB-AA (`harveyLabAllPass`)
- **What it measures:** Artificial Analysis' implementation of Harvey's Legal Agent Benchmark (LAB), testing AI agents on real-world legal work from Harvey's dataset of 120 private tasks spanning 24 legal practice areas. The agent reads case documents in a sandbox and produces legal deliverables, graded criterion-by-criterion by a single LLM rubric judge.
- **Scale:** 0.0 to 1.0 (task all-pass rate)
- **RSC field:** v4.3 renamed `harveyLabAllPass` → `harveyLab`. The sync script hybrid-reads both; the JSON key remains `harveyLabAllPass`.
- **Official page:** https://artificialanalysis.ai/evaluations/harvey-lab-aa

### APEX-Agents-AA (`apexAgents`)
- **What it measures:** Artificial Analysis' implementation of the APEX-Agents benchmark, testing AI agents on long-horizon, cross-application tasks in professional-services environments with realistic application tooling.
- **Scale:** 0.0 to 1.0 (task completion rate)
- **Historical coverage (38-model sample):** 18/38 models
- **Historical range (same sample):** 0.018 — 0.471
- **Official page:** https://artificialanalysis.ai/evaluations/apex-agents-aa

### ITBench-AA (`itBenchSre`)
- **What it measures:** Artificial Analysis' implementation of IBM's ITBench benchmark, testing AI agents on Kubernetes incident root-cause analysis from offline incident snapshots. The agent inspects alerts, events, traces, and topology and identifies the contributing-factor entities responsible for the failure.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Historical coverage (38-model sample):** 18/38 models
- **Historical range (same sample):** 0.011 — 0.467
- **Official page:** https://artificialanalysis.ai/evaluations/itbench-aa

### AA-Briefcase (`briefcaseElo`)
- **What it measures:** Realistic multi-week knowledge-work projects (91 tasks across 4 scenarios) with thousands of source files. Combined Elo aggregates rubric pass rate, analytical quality, and presentation quality from a three-judge panel.
- **Scale:** Elo rating (higher is better); index contribution uses `clamp((Elo − 500) / 2000)`
- **Part of:** Intelligence Index v5 (Knowledge Work, 15%; was Agents, 15% in v4.3)
- **Official page:** https://artificialanalysis.ai/evaluations/aa-briefcase

---

## Cost & Performance Metrics

### Input Price
- **Unit:** USD per 1 million input tokens
- **Why it matters:** Cost of sending prompts to the model.

### Output Price
- **Unit:** USD per 1 million output tokens
- **Why it matters:** Cost of receiving generated text from the model.

### Blended Price (7:2:1)
- **Unit:** USD per 1 million tokens
- **Calculation:** Weighted average assuming 7 parts cache hits, 2 parts regular input, and 1 part output tokens. Formula: `(cachePrice × 7 + inputPrice × 2 + outputPrice × 1) / 10`
- **Why it matters:** Best single metric for estimating total API costs. Reflects real-world usage where ~70% of input tokens are served from prompt cache at a steep discount (typically 90% off regular input price).
- **Source:** [Artificial Analysis Methodology](https://artificialanalysis.ai/methodology)

### Cost to Run Intelligence Index
- **Unit:** USD
- **What it measures:** Total cost to evaluate the model on the full Intelligence Index benchmark suite.
- **Why it matters:** Indicates how expensive the model is to run comprehensive evaluations. Higher values often correlate with more verbose models.

### Cost per Task (`costPerTask`)
- **Unit:** USD per benchmark task
- **What it measures:** AA's evaluation-weighted average API cost per Intelligence Index task, sourced directly from `intelligenceIndexCostPerTask.cost.total`. Each evaluation's cost per task is weighted by its Intelligence Index weight. It is **not a median** and should not be reconstructed by dividing total evaluation cost by a single aggregate task count.
- **Why it matters:** Estimates cost per benchmark task while accounting for the evaluation mix. Values span a wide range, so the chart uses a **logarithmic x-axis** in cost-per-task mode. It is not a guarantee of the cost of a user's workload.
- **Coverage:** Varies; count non-null `costPerTask` values in the current JSON. The old 63/70 figure was an August 2026 snapshot, not live coverage.
- **Chart scope:** Except for Code2Video-AA's separate estimates, evaluation-cost modes use the whole v5 index's costs even when the y-axis is a category or individual benchmark. Labels explicitly identify this scope; these are not metric-specific evaluation costs. The UI uses "evaluation-weighted average", not "median".
- **Related fields (not tracked here):** `intelligenceIndexTimePerTask` (time per benchmark task) and `intelligenceIndexOutputTokensPerTask` (verbosity breakdown). Consult AA's current definitions for weighting and timing exclusions.

### Output Speed
- **Unit:** Tokens per second
- **Why it matters:** Determines user experience latency for streaming responses.
- **Tracking:** Not currently persisted by this sync. Missing speed data does not prevent adding a model whose benchmark data is available.

### Context Window
- **Unit:** Tokens
- **Why it matters:** Maximum amount of text the model can process in a single request.

---

## Data Quality Notes

1. **Benchmark availability varies:** Not all benchmarks are available for all models. Some are only run on frontier models or models with specific capabilities (e.g., multimodal).

2. **Lab-claimed vs. independent:** Artificial Analysis runs independent evaluations. Some fields like `lab_claimed_aime` represent the model creator's self-reported scores, which may differ.

3. **Composite limitations:** The official overall score and locally derived category scores aggregate different evaluations. Category reconstructions are not official published scores, and Briefcase's current Elo can differ from AA's frozen-at-addition contribution. Choose metrics relevant to the actual use case.

4. **Scale differences:** Be careful comparing raw scores — benchmarks have different scales and difficulty ceilings. GPQA scores of 0.9+ are excellent, while HLE scores above 0.4 are world-class.

5. **Description accuracy:** Benchmark descriptions come from AA's methodology and evaluation pages. The local Coding, Knowledge Work, Science, and General formulas are explicitly documented reconstructions, not official published composites.

---

## Methodology

Artificial Analysis independently evaluates models by:
- Running benchmarks themselves (not relying on lab-reported numbers)
- Using standardized prompts and evaluation protocols
- Testing on held-out or proprietary test sets where possible
- Updating benchmarks regularly as new, harder tests are developed

For the most current methodology, visit: https://artificialanalysis.ai

---

## How to Add New Models

Follow the [maintenance guide](../../docs/AI_MODELS_MAINTENANCE.md) for the complete procedure and runnable read-only probe/pre-commit validator. In brief:

1. Inspect the exact AA model/variant slugs and full model payload, not just the release summary.
2. Add approved slugs to `TARGET_URL` in `scripts/sync-ai-models.py`. Use `DISPLAY_NAMES` only when needed. New providers may require both chart color palettes to be updated.
3. For default-hidden variants, update `DEFAULT_HIDDEN_IDS` and increment the current `FILTER_VERSION` in `src/app/agentic-ai/page.tsx`. Read the guide's localStorage migration caveat before promising default-unhide behavior to returning users.
4. Run `python3 scripts/sync-ai-models.py` using an environment with Playwright and Chromium.
5. Validate the **entire** refresh: expected unique IDs, retained models, ranks, source metadata, requested visibility, and any coverage losses. Passing the 90% guard alone is insufficient.
6. Update this header's actual model count/sync date and run `npm run build`.
7. Review/stage only relevant files, then commit/publish when approved using `git pull --rebase` followed by `git push`. Never force-push.

**Tip — effort variants:** Base slugs may represent max, high, xhigh, or no named effort. Lower efforts can also have full evaluations. Verify each actual model and do not infer unavailable benchmarks from an unfamiliar page layout or missing speed data. Missing source scores remain `null`; never manufacture zeros.

## How to Add New Benchmark Metrics

Adding a new **benchmark metric** (e.g., when AA announces a new evaluation) requires coordinated changes:

1. **`scripts/sync-ai-models.py`** — Add the field to the `clean_model()` output dict. Use hybrid reads: `raw.get("camelCaseName", raw.get("snake_case_name"))`.
2. **`src/components/ModelBenchmarkChart.tsx`** — Add the field to the `AIModel` interface (e.g., `newField: number | null;`).
3. **`src/app/agentic-ai/page.tsx`** — Add an entry to the `METRICS` array with `key`, `label`, `description`, `testBadge`, `scale`, `fullDescription`, and `officialUrl`.
   For benchmark-specific costs, update **`src/lib/ai-model-costs.ts`**, both chart tooltips, and cost labels. Never silently reuse another benchmark's costs. Add version metadata, regression tests, and source coverage checks.
4. Run `python3 scripts/sync-ai-models.py` to regenerate the data, then validate the full model set and metadata coverage.
5. Run `npm run build` to verify TypeScript compiles.
6. Commit and push all changed files.

---

## RSC Data Format Change (July 2026)

Artificial Analysis changed their RSC (React Server Component) data format from **snake_case** to **camelCase** in July 2026, coinciding with the Intelligence Index v4.1 update and Grok 4.5 launch. For example:

| Old field (snake_case) | New field (camelCase) |
|---|---|
| `intelligence_index` | `intelligenceIndex` |
| `price_1m_input_tokens` | `price1mInputTokens` |
| `context_window_tokens` | `contextWindowTokens` |
| `model_creators` (list) | `creator` (single dict) |
| `intelligence_index_cost.total_cost` | `intelligenceIndexCost.total` |

The sync script uses **hybrid field reads** (camelCase first, snake_case fallback) to handle this change robustly. If AA reverts to snake_case, the script will continue to work. The extraction anchor also checks for both `"intelligenceIndex"` and `"intelligence_index"` when locating the full model object in the RSC payload.

## RSC Data Format Changes (October 2026)

AA pages can now carry full model rows in `initialModels[]`, while other pages still use the legacy `currentModel` structure. The sync tries `_extract_from_initial_models()` before `_extract_model_legacy()`. Both layouts must remain supported; a missing `currentModel` wrapper does not mean a page has no evaluations. Nested release/family summaries can also carry a slug and intelligence score without full model metadata.

| Raw aliases accepted by the sync | Stable generated JSON key |
| --- | --- |
| `terminalbenchV21`, `terminalBench21`, `terminalbench_v2_1` | `terminalbenchV21` |
| `terminalbenchV40`, `terminalBench40`, `terminalbench_v4_0` | `terminalbenchV40` |
| `harveyLab`, `harveyLabAllPass` | `harveyLabAllPass` |

The v5 migration explicitly added `terminalBenchScience` and other new evaluations through the schema/UI workflow above. They are not aliases or substitutes for legacy fields. Reference-only `initialModels[]` arrays fall back to a full matching `currentModel`; JSON decoding has no arbitrary array-size limit.

The original October sync added a **90% target-count backstop**. The v5 migration adds a stricter **all-target, all-row validation before writing**, with duplicate/schema/metadata/finite-value/rank checks. A lower number of benchmarked models is not a missing-row error. Follow the maintenance guide's source coverage review and run the offline tests; even a complete model count is not proof of source accuracy.
