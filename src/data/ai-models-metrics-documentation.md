# AI Model Benchmark Metrics Documentation

**Source:** [Artificial Analysis](https://artificialanalysis.ai)  
**Last Updated:** 2026-07-24  
**Models Tracked:** 60 leading LLMs  
**Intelligence Index Version:** v4.1 (updated July 2026 — see [format change notes](#rsc-data-format-change-july-2026) below)

---

## Composite Indices (Averages)

These are aggregate scores computed by Artificial Analysis from multiple individual benchmarks. They provide a high-level view of model capabilities.

### Artificial Analysis Intelligence Index
- **What it measures:** Overall model intelligence across reasoning, knowledge, maths and programming.
- **Scale:** Higher is better (theoretical max varies, current leader ~60)
- **How it's calculated:** Weighted average across four categories (Agents 25%, Coding 25%, General 25%, Scientific Reasoning 25%), each measured independently by Artificial Analysis.
- **Included benchmarks (v4.1 — July 2026):** GDPval-AA v2, 𝜏³-Banking, Terminal-Bench v2.1, SciCode, AA-LCR, AA-Omniscience, HLE, GPQA Diamond, CritPt.
- **Category breakdown:**
  - **Agents (25%):** GDPval-AA v2, 𝜏³-Banking
  - **Coding (25%):** Terminal-Bench v2.1, SciCode
  - **General (25%):** AA-LCR, AA-Omniscience
  - **Scientific Reasoning (25%):** HLE, GPQA Diamond, CritPt
- **Changes from v4.0:** IFBench, 𝜏²-Bench Telecom, and Terminal-Bench Hard were removed. GDPval-AA was upgraded to v2. 𝜏³-Banking replaced 𝜏²-Bench Telecom. Terminal-Bench v2.1 replaced Terminal-Bench Hard.
- **Methodology:** Artificial Analysis estimates a 95% confidence interval of less than ±1% based on experiments with >10 repeats on certain models for all evaluation datasets. The Intelligence Index is a text-only, English language evaluation suite; multimodal and multilingual performance are benchmarked separately.
- **Why it matters:** The single best metric for comparing overall model capability. A more useful synthesis comparison between language models than any other metric in existence today.
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking

### Coding Index
- **What it measures:** Programming and software development capabilities.
- **Scale:** Higher is better
- **How it's calculated:** Weighted average of coding benchmarks in the Artificial Analysis Intelligence Index: Terminal-Bench v2.1 (66.7%) and SciCode (33.3%).
- **Included benchmarks:** Terminal-Bench v2.1 (verified refresh of v2.0 — 89 curated agentic tasks), SciCode (scientific code generation across 16 disciplines).
- **Why it matters:** Critical for developers choosing models for code generation, debugging, and software engineering tasks.
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking

### Agentic Index
- **What it measures:** The model's ability to act as an autonomous agent — planning, tool use, multi-step reasoning, and task completion.
- **Scale:** Higher is better
- **How it's calculated:** Average of agentic capabilities benchmarks in the Artificial Analysis Intelligence Index: GDPval-AA v2 and 𝜏³-Banking.
- **Included benchmarks:** GDPval-AA v2 (real-world tasks across 44 occupations and 9 major industries via agentic loop), 𝜏³-Banking (fintech customer-support agent navigating knowledge bases and multi-step tool calls).
- **Why it matters:** Important for applications where the model needs to perform complex workflows, use tools, or operate autonomously.
- **Official page:** https://artificialanalysis.ai/methodology/intelligence-benchmarking

### Math Index (Deprecated)
- **What it measures:** Mathematical reasoning and problem-solving abilities.
- **Scale:** Higher is better
- **Status:** **Deprecated.** As of July 2026, AA's RSC data no longer populates this field (0/38 models). Retained in the schema for backward compatibility but always `null`. Use `aime25` or individual math benchmarks instead.

---

## Individual Benchmarks

### GPQA Diamond (Graduate-Level Google-Proof Q&A)
- **What it measures:** The most challenging 198 questions from GPQA, where PhD experts achieve 65% accuracy but skilled non-experts only reach 34% despite web access.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Format:** Multiple-choice questions at PhD level in biology, chemistry, and physics.
- **Background:** These graduate-level questions are designed to be "Google-proof" and require genuine scientific expertise rather than search skills. They can only be consistently solved by domain experts with PhDs, making them ideal for testing true scientific reasoning capabilities.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests deep domain expertise and reasoning in hard sciences. A score above 0.85 indicates strong scientific reasoning.
- **Current range (38 models):** 0.782 — 0.941
- **Official page:** https://artificialanalysis.ai/evaluations/gpqa-diamond
- **Publication:** [GPQA: A Graduate-Level Google-Proof Q&A Benchmark](https://arxiv.org/abs/2311.12022) (David Rein, Betty Li Hou, Asa Cooper Stickland, Jackson Petty, Richard Yuanzhe Pang, Julien Dirani, Julian Michael, Samuel R. Bowman)

### HLE (Humanity's Last Exam)
- **What it measures:** A frontier-level benchmark with 2,500 expert-vetted questions across mathematics, sciences, and humanities, designed to be the final closed-ended academic evaluation.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** A collaborative effort by the Center for AI Safety involving over 1,000 contributors to create frontier-level academic questions that challenge current AI capabilities. The questions are designed to be 'Google-proof' and require genuine understanding rather than information retrieval, serving as the intended final closed-ended academic benchmark.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** One of the hardest existing benchmarks. Even top models score below 0.5, leaving significant headroom.
- **Current range (38 models):** 0.173 — 0.533
- **Official page:** https://artificialanalysis.ai/evaluations/humanitys-last-exam

### SciCode
- **What it measures:** A scientist-curated coding benchmark featuring 288 test set subproblems from 80 laboratory problems across 16 scientific disciplines.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** Unlike traditional coding benchmarks, SciCode requires integrating scientific knowledge with programming skills to solve real research problems rather than abstract puzzles. The benchmark was developed by domain experts across 16 diverse natural science sub-fields, including mathematics, physics, chemistry, biology, and materials science.
- **Methodology:** Problems naturally factorize into multiple subproblems, each involving knowledge recall, reasoning, and code synthesis. It offers optional descriptions specifying useful scientific background information and scientist-annotated gold-standard solutions and test cases for evaluation. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests the intersection of coding ability and scientific understanding. Important for research automation.
- **Current range (38 models):** 0.360 — 0.602
- **Official page:** https://artificialanalysis.ai/evaluations/scicode
- **Publication:** [SciCode: A Research Coding Benchmark Curated by Scientists](https://arxiv.org/abs/2407.13168) (Minyang Tian, Luyu Gao, Shizhuo Dylan Zhang, Xinan Chen, Cunwei Fan, Xuefei Guo, Roland Haas, Pan Ji, Kittithat Krongchon, Yao Li, Shengyan Liu, Di Luo, Yutao Ma, Hao Tong, Kha Trinh, Chenyu Tian, Zihan Wang, Bohao Wu, Yanyu Xiong, Shengzhu Yin, and 10 others)

### GDPval (GDPval-AA Leaderboard)
- **What it measures:** Artificial Analysis' evaluation framework for OpenAI's GDPval dataset. Tests AI models on real-world tasks across 44 occupations and 9 major industries. Models are given shell access and web browsing capabilities in an agentic loop via Stirrup to solve tasks.
- **Scale:** ELO rating (higher is better, no fixed upper bound)
- **How it's calculated:** ELO ratings are derived from blind pairwise comparisons of model outputs.
- **Background:** The GDPval gold public dataset includes 220 tasks developed by OpenAI in collaboration with industry professionals to reflect real-world complexity. The benchmark requires models to produce diverse outputs including documents, slides, diagrams, and spreadsheets, mirroring actual work products across finance, healthcare, legal, and other professional domains.
- **Why it matters:** Tests practical, open-ended real-world agentic capabilities beyond traditional academic benchmarks.
- **Current range (38 models):** 689.5 — 1759.6
- **Official page:** https://artificialanalysis.ai/evaluations/gdpval-aa

### Tau-2 (τ²-Bench Telecom)
- **What it measures:** A dual-control conversational AI benchmark simulating technical support scenarios where both agent and user must coordinate actions to resolve telecom service issues.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** 𝜏²-Bench (Tau-2 Bench) introduces a new paradigm for evaluating conversational AI by simulating both the agent and user to actively modify a shared world state. The telecom domain tests agents' abilities to guide users through technical troubleshooting to test problem-solving and effective communication skills. Developed by Sierra Research, this benchmark addresses gaps between other benchmarks and real-world customer service scenarios where users are active participants in problem resolution.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests multi-turn agent coordination and task completion in realistic customer-service dialogues.
- **Current range (38 models):** 0.658 — 0.991
- **Official page:** https://artificialanalysis.ai/evaluations/tau2-bench
- **Publication:** [𝜏²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) (Victor Barres, Honghua Dong, Soham Ray, Xujie Si, Karthik Narasimhan)

### IFBench (Instruction Following Benchmark)
- **What it measures:** A benchmark evaluating precise instruction-following generalization on 58 diverse, verifiable out-of-domain constraints that test models' ability to follow specific output requirements.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** IFBench addresses the problem that current language models strongly overfit to a small set of verifiable constraints and cannot generalize well to unseen output constraints, a critical skill for practical AI applications. The benchmark introduces 58 new, diverse, and challenging verifiable constraints to test precise instruction-following generalization, going beyond existing benchmarks that focus on a limited set of constraint types.
- **Methodology:** Developed by the Allen Institute for AI, IFBench uses reinforcement learning with verifiable rewards (RLVR) to improve instruction following and includes 29 additional hand-annotated training constraints with verification functions. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Critical for real-world applications where precise adherence to instructions is required.
- **Current range (38 models):** 0.531 — 0.829
- **Official page:** https://artificialanalysis.ai/evaluations/ifbench
- **Publication:** [Generalizing Verifiable Instruction Following](https://arxiv.org/abs/2507.02833) (Valentina Pyatkin, Saumya Malik, Victoria Graf, Hamish Ivison, Shengyi Huang, Pradeep Dasigi, Nathan Lambert, Hannaneh Hajishirzi)

### TerminalBench Hard
- **What it measures:** An agentic benchmark evaluating AI capabilities in terminal environments through software engineering, system administration, and data processing tasks.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** Terminal-Bench is a comprehensive benchmark developed by Stanford University and the Laude Institute for evaluating AI agents in realistic terminal environments. The "hard" subset contains challenging tasks that test agents' abilities to compile code, train models, configure servers, play games, and debug systems in representative scenarios for real-world problems and terminal use patterns.
- **Methodology:** Tasks cover a wide range of engineering, game playing, and system administration tasks that are unlikely to be pattern-matched on training data. Outcomes are evaluated programmatically with verification scripts executed in the agent's Docker environment, requiring agents to successfully meet a range of output conditions. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests practical system administration and command-line reasoning abilities.
- **Current range (38 models):** 0.235 — 0.629
- **Official page:** https://artificialanalysis.ai/evaluations/terminalbench-hard

### CritPT (Critical Physics Thinking)
- **What it measures:** A benchmark designed to test LLMs on research-level physics reasoning tasks, featuring 71 composite research challenges.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** CritPt evaluates language models on solving unpublished, frontier-level physics problems that require genuine research-scale reasoning. The benchmark comprises 71 challenges (70 test challenges and one example), created by over 50 active physics researchers across 30 institutions and spanning 11 physics subfields including condensed matter, quantum physics, astrophysics, high energy physics, and biophysics. Each problem underwent extensive review (averaging 40+ hours per challenge) and uses "guess-resistant" answer formats including floating-point arrays, symbolic expressions, and Python functions.
- **Methodology:** All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests advanced scientific reasoning in physics, beyond standard textbook problems. Leading models in 2025 achieve only single-digit accuracy, highlighting the substantial gap between current AI capabilities and research-level physics reasoning.
- **Current range (38 models):** 0.003 — 0.286
- **Official page:** https://artificialanalysis.ai/evaluations/critpt
- **Publication:** [Probing the Critical Point (CritPt) of AI Reasoning: a Frontier Physics Research Benchmark](https://arxiv.org/abs/2509.26574) (Minhui Zhu, Minyang Tian, Xiaocheng Yang, Tianci Zhou, Penghao Zhu, Eli Chertkov, Shengyan Liu, Yufeng Du, Lifan Yuan, Ziming Ji, Indranil Das, Junyi Cao, Jinchen He, Yifan Su, Jiabin Yu, Yikun Jiang, Yujie Zhang, Chang Liu, Ze-Min Huang, Weizhen Jia, and 44 others)

### MMMU Pro (Massive Multi-discipline Multimodal Understanding — Professional)
- **What it measures:** An enhanced MMMU benchmark that eliminates shortcuts and guessing strategies to more rigorously test multimodal models across 30 academic disciplines.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** MMMU-Pro addresses limitations in the original MMMU through a three-step enhancement process: filtering out questions answerable by text-only models, expanding multiple-choice options from 4 to 10, and introducing a vision-only input format where questions are embedded within screenshots or photos. The benchmark contains 3,460 questions across six core disciplines (Art & Design, Business, Science, Health & Medicine, Humanities & Social Science, and Tech & Engineering).
- **Methodology:** Requires models to simultaneously process visual and textual information in a more realistic setting. Performance results show substantial drops across all tested models compared to the original MMMU, demonstrating the benchmark's effectiveness in exposing current limitations in multimodal AI systems. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Tests vision-language capabilities at expert level. Only available for models with multimodal support.
- **Coverage:** 21/38 models (multimodal models only)
- **Current range:** 0.687 — 0.843
- **Official page:** https://artificialanalysis.ai/evaluations/mmmu-pro
- **Publication:** [MMMU-Pro: A More Robust Multi-discipline Multimodal Understanding Benchmark](https://arxiv.org/abs/2409.02813) (Xiang Yue, Tianyu Zheng, Yuansheng Ni, Yubo Wang, Kai Zhang, Shengbang Tong, Yuxuan Sun, Botao Yu, Ge Zhang, Huan Sun, Yu Su, Wenhu Chen, Graham Neubig)

### LCR (Long Context Reasoning)
- **What it measures:** Language models' ability to extract, reason about, and synthesize information from long-form documents ranging from 10k to 100k tokens (measured using the cl100k_base tokenizer).
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Background:** Long-form text comprehension represents an under-studied class of evaluations where humans dramatically outscore language models, despite expanding context windows in current AI systems. LCR features 100 questions across diverse document types including academic papers, company financials, government consultations, legal documents, industry reports, and marketing materials, requiring genuine reasoning rather than simple data extraction.
- **Methodology:** Each question demands multi-step reasoning to synthesize information from dispersed sections, understand complex domain-specific content, and produce unambiguous answers that mid-2024 frontier models achieve less than 50% accuracy on. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Critical for applications processing long documents, where the model must find relevant information in extensive text.
- **Current range (38 models):** 0.507 — 0.743
- **Official page:** https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning

### Omniscience
- **What it measures:** Factual recall and hallucination across various economically relevant domains. AA-Omniscience is a knowledge and hallucination benchmark that rewards accuracy, punishes bad guesses, and provides a comprehensive view of which models produce factually reliable outputs across different domains.
- **Scale:** -100 to 100 (higher is better, can be negative)
- **Background:** The benchmark contains 6,000 questions across 6 major domains, derived from authoritative academic and industry sources and generated automatically using an LLM-based question generation agent to ensure unambiguity, scalability, and factual precision.
- **Methodology:** The evaluation measures a model's AA-Omniscience Index, a bounded metric (-100 to 100) measuring factual recall that jointly penalizes hallucinations and rewards abstention when uncertain, with 0 equating to a model that answers questions correctly as much as it does incorrectly. All evaluations are conducted independently by Artificial Analysis.
- **Why it matters:** Indicates the breadth of the model's training knowledge and its tendency to hallucinate. Performance varies by domain, suggesting models should be chosen according to the demands of the use case rather than general performance for tasks where knowledge is important.
- **Current range (38 models):** -50.1 — 40.2
- **Official page:** https://artificialanalysis.ai/evaluations/omniscience
- **Publication:** [AA-Omniscience: Evaluating Cross-Domain Knowledge Reliability in Large Language Models](https://arxiv.org/abs/2511.13029) (Declan Jackson, William Keating, George Cameron, Micah Hill-Smith)

---

## Sparsely Available Benchmarks

The following benchmarks are only available for a small subset of models:

### AIME25
- **What it measures:** American Invitational Mathematics Examination 2025 problems.
- **Scale:** 0.0 to 1.0
- **Coverage:** 3/38 models
- **Current range:** 0.880 — 0.934
- **Why it matters:** Competitive math benchmark; olympiad-level mathematical reasoning with integer answers from 000-999.

### LiveCodeBench
- **What it measures:** Live coding competition problems. A contamination-free coding benchmark that continuously harvests fresh competitive programming problems from LeetCode, AtCoder, and CodeForces, evaluating code generation, self-repair, and execution.
- **Scale:** 0.0 to 1.0
- **Coverage:** 3/38 models
- **Current range:** 0.714 — 0.878
- **Why it matters:** Tests coding under time pressure with fresh, unseen problems.

### Removed / Dead Fields (July 2026)
The following fields are retained in the JSON schema for backward compatibility but are no longer populated by AA's RSC data (0/38 models). They were removed when AA migrated to camelCase field naming:
- **AIME** (`aime`) — replaced by `aime25`
- **HumanEval** (`humaneval`) — no longer in RSC data
- **MMLU Pro** (`mmluPro`) — superseded by `mmmuPro` (MMMU-Pro), which is now a primary benchmark
- **Math-500** (`math500`) — no longer in RSC data
- **Multilingual AA** (`multilingualAA`) — no longer in RSC data

---

## New Agentic Benchmarks (July 2026)

Artificial Analysis introduced several new agentic benchmarks alongside Intelligence Index v4.1. Two of these (`tauBanking` and `terminalbenchV21`) are components of the Intelligence Index v4.1 itself; the rest are standalone agentic evaluations tracked separately.

### 𝜏³-Banking (`tauBanking`)
- **What it measures:** A fintech customer-support benchmark from the 𝜏-Knowledge framework that tests whether agents can navigate a large unstructured knowledge base and execute multi-step tool calls to resolve realistic banking workflows.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Coverage:** 30/38 models
- **Current range:** 0.087 — 0.326
- **Part of:** Intelligence Index v4.1 (Agents category)
- **Official page:** https://artificialanalysis.ai/evaluations/tau3-banking

### Terminal-Bench v2.1 (`terminalbenchV21`)
- **What it measures:** A verified refresh of Terminal-Bench v2.0 — 89 curated tasks across software engineering, system administration, data processing, model training, and security, with environment and instruction fixes so scores reflect agent capability rather than environment gaps.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Coverage:** 30/38 models
- **Current range:** 0.262 — 0.846
- **Part of:** Intelligence Index v4.1 (Coding category)
- **Official page:** https://artificialanalysis.ai/evaluations/terminalbench-v2-1

### AutomationBench-AA (`automationBench`)
- **What it measures:** Agentic task completion across simulated SaaS application environments, scoring the share of each task's objectives completed without guardrail violations. Covers 657 tasks across six business domains (Finance, HR, Marketing, Operations, Sales, Support) using simulated environments for Gmail, Google Sheets, Slack, Salesforce, Zendesk, Jira, and HubSpot.
- **Scale:** 0.0 to 1.0 (share of objectives completed)
- **Coverage:** 20/38 models
- **Current range:** 0.057 — 0.514
- **Developed by:** Zapier (arXiv: 2604.18934)
- **Official page:** https://artificialanalysis.ai/evaluations/automationbench-aa

### EnterpriseOps-Gym-AA (`enterpriseOpsGym`)
- **What it measures:** Artificial Analysis' independent implementation of ServiceNow's EnterpriseOps-Gym, an agentic benchmark testing whether LLM agents can complete stateful, multi-step enterprise workflows across eight business domains via live tool use, graded on the final state of the underlying databases.
- **Scale:** 0.0 to 1.0 (task completion rate)
- **Coverage:** 19/38 models
- **Current range:** 0.252 — 0.511
- **Official page:** https://artificialanalysis.ai/evaluations/enterprise-ops-gym-aa

### Harvey LAB-AA (`harveyLabAllPass`)
- **What it measures:** Artificial Analysis' implementation of Harvey's Legal Agent Benchmark (LAB), testing AI agents on real-world legal work from Harvey's dataset of 120 private tasks spanning 24 legal practice areas. The agent reads case documents in a sandbox and produces legal deliverables, graded criterion-by-criterion by a single LLM rubric judge.
- **Scale:** 0.0 to 1.0 (task all-pass rate)
- **Coverage:** 21/38 models
- **Current range:** 0.000 — 0.142
- **Official page:** https://artificialanalysis.ai/evaluations/harvey-lab-aa

### APEX-Agents-AA (`apexAgents`)
- **What it measures:** Artificial Analysis' implementation of the APEX-Agents benchmark, testing AI agents on long-horizon, cross-application tasks in professional-services environments with realistic application tooling.
- **Scale:** 0.0 to 1.0 (task completion rate)
- **Coverage:** 18/38 models
- **Current range:** 0.018 — 0.471
- **Official page:** https://artificialanalysis.ai/evaluations/apex-agents-aa

### ITBench-AA (`itBenchSre`)
- **What it measures:** Artificial Analysis' implementation of IBM's ITBench benchmark, testing AI agents on Kubernetes incident root-cause analysis from offline incident snapshots. The agent inspects alerts, events, traces, and topology and identifies the contributing-factor entities responsible for the failure.
- **Scale:** 0.0 to 1.0 (accuracy)
- **Coverage:** 18/38 models
- **Current range:** 0.011 — 0.467
- **Official page:** https://artificialanalysis.ai/evaluations/itbench-aa

### AA-Briefcase (`briefcaseElo`)
- **What it measures:** A private evaluation developed by Artificial Analysis for frontier agentic capability in long-horizon knowledge work, testing agents on realistic business workflows that require deliverables such as spreadsheets, presentations, and memos. AA-Briefcase Elo is a combined metric that aggregates rubric pass rate, analytical quality Elo and presentation Elo.
- **Scale:** Elo rating (higher is better)
- **Coverage:** 23/38 models
- **Current range:** 0.0 — 1583.2
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

### Output Speed
- **Unit:** Tokens per second
- **Why it matters:** Determines user experience latency for streaming responses.

### Context Window
- **Unit:** Tokens
- **Why it matters:** Maximum amount of text the model can process in a single request.

---

## Data Quality Notes

1. **Benchmark availability varies:** Not all benchmarks are available for all models. Some are only run on frontier models or models with specific capabilities (e.g., multimodal).

2. **Lab-claimed vs. independent:** Artificial Analysis runs independent evaluations. Some fields like `lab_claimed_aime` represent the model creator's self-reported scores, which may differ.

3. **Composite indices are most reliable:** When comparing models, the composite indices (Intelligence, Coding, Agentic) are more robust than individual benchmarks because they average across multiple tasks.

4. **Scale differences:** Be careful comparing raw scores — benchmarks have different scales and difficulty ceilings. GPQA scores of 0.9+ are excellent, while HLE scores above 0.4 are world-class.

5. **Description accuracy:** Where possible, descriptions are sourced from the official Artificial Analysis evaluation pages. Some composite indices (Intelligence, Coding, Agentic, Math) and sparsely-tested benchmarks rely on inferred descriptions.

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

Adding a new **model** (e.g., a newly released LLM) is simple — no component changes needed:

1. Go to [artificialanalysis.ai/models](https://artificialanalysis.ai/models) and find the model you want to add.
2. Copy the model's slug from the URL (e.g., `gemini-3-5-flash` from `https://artificialanalysis.ai/models/gemini-3-5-flash`).
3. Open `scripts/sync-ai-models.py` and add the slug to the `TARGET_URL` query parameter (comma-separated).
4. **(Optional)** If the slug looks ugly (e.g., `mimo-v2-5-0424`), add a custom display name to the `DISPLAY_NAMES` dict.
5. Run the sync script: `python scripts/sync-ai-models.py`
6. The script fetches all benchmark data for the new model and regenerates `src/data/ai-models.json`. No component changes are needed — the chart auto-adapts.
7. Verify the new model appears in the output, then commit and push.

**Tip — effort variants:** Some models ship multiple effort levels (e.g., Claude Sonnet 5 ships `max`, `xhigh`, `high`, `medium`, `low` variants). Usually only the base slug (e.g., `claude-sonnet-5` = Max Effort) has full benchmark data; the lower-effort variants may have `null` intelligence scores. Check the AA page before choosing a slug.

## How to Add New Benchmark Metrics

Adding a new **benchmark metric** (e.g., when AA announces a new evaluation) requires changes in 3 files:

1. **`scripts/sync-ai-models.py`** — Add the field to the `clean_model()` output dict. Use hybrid reads: `raw.get("camelCaseName", raw.get("snake_case_name"))`.
2. **`src/components/ModelBenchmarkChart.tsx`** — Add the field to the `AIModel` interface (e.g., `newField: number | null;`).
3. **`src/app/agentic-ai/page.tsx`** — Add an entry to the `BENCHMARKS` array with `key`, `label`, `description`, `testBadge`, `scale`, `fullDescription`, and `officialUrl`.
4. Run `python scripts/sync-ai-models.py` to regenerate the data.
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
