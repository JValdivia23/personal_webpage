# AI Model Benchmark Metrics Documentation

**Source:** [Artificial Analysis](https://artificialanalysis.ai)  
**Last Updated:** 2026-04-25  
**Models Tracked:** 24 leading LLMs

---

## Composite Indices (Averages)

These are aggregate scores computed by Artificial Analysis from multiple individual benchmarks. They provide a high-level view of model capabilities.

### Artificial Analysis Intelligence Index
- **What it measures:** Overall model intelligence across reasoning, knowledge, coding, and problem-solving tasks.
- **Scale:** Higher is better (theoretical max varies, current leader ~60)
- **How it's calculated:** Average of all intelligence evaluation benchmarks measured independently by Artificial Analysis.
- **Included benchmarks:** GPQA, HLE, SciCode, IFBench, Tau2, TerminalBench Hard, CritPT, and others.
- **Why it matters:** The single best metric for comparing overall model capability.

### Coding Index
- **What it measures:** Programming and software development capabilities.
- **Scale:** Higher is better
- **How it's calculated:** Average of coding-specific benchmarks (HumanEval, LiveCodeBench, SciCode, etc.).
- **Why it matters:** Critical for developers choosing models for code generation, debugging, and software engineering tasks.

### Agentic Index
- **What it measures:** The model's ability to act as an autonomous agent — planning, tool use, multi-step reasoning, and task completion.
- **Scale:** Higher is better
- **How it's calculated:** Average of agentic capabilities benchmarks.
- **Why it matters:** Important for applications where the model needs to perform complex workflows, use tools, or operate autonomously.

### Math Index
- **What it measures:** Mathematical reasoning and problem-solving abilities.
- **Scale:** Higher is better
- **How it's calculated:** Average of math-focused benchmarks (AIME, Math-500, etc.).
- **Why it matters:** Indicates capability in STEM fields, formal reasoning, and structured problem solving.

---

## Individual Benchmarks

### GPQA (Graduate-Level Google-Proof Q&A)
- **What it measures:** Performance on graduate-level science questions in biology, chemistry, and physics that are difficult to answer via simple web search.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Format:** Multiple-choice questions at PhD level.
- **Why it matters:** Tests deep domain expertise and reasoning in hard sciences. A score above 0.85 indicates strong scientific reasoning.
- **Current range (24 models):** 0.782 — 0.941

### HLE (Humanity's Last Exam)
- **What it measures:** Performance on extremely difficult, expert-level questions designed to be near the frontier of human knowledge.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** One of the hardest existing benchmarks. Even top models score below 0.5, leaving significant headroom.
- **Current range (24 models):** 0.173 — 0.447

### SciCode
- **What it measures:** Scientific code generation — writing code to solve scientific research problems.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** Tests the intersection of coding ability and scientific understanding. Important for research automation.
- **Current range (24 models):** 0.360 — 0.589

### GDPval
- **What it measures:** A validation metric from Artificial Analysis that appears to correlate with overall model quality and robustness.
- **Scale:** Higher is better (no fixed upper bound)
- **Why it matters:** Provides an additional signal of model reliability beyond raw benchmark scores.
- **Current range (24 models):** 947.7 — 1781.7

### Tau2
- **What it measures:** Correlation or agreement metric (likely inter-annotator agreement or consistency score).
- **Scale:** 0.0 to 1.0
- **Why it matters:** Higher values indicate more consistent and reliable model outputs. Values above 0.9 suggest high consistency.
- **Current range (24 models):** 0.658 — 0.977

### IFBench (Instruction Following Benchmark)
- **What it measures:** Ability to follow complex, nuanced instructions accurately.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** Critical for real-world applications where precise adherence to instructions is required.
- **Current range (24 models):** 0.531 — 0.812

### TerminalBench Hard
- **What it measures:** Performance on difficult terminal/command-line tasks and system-level operations.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** Tests practical system administration and command-line reasoning abilities.
- **Current range (24 models):** 0.235 — 0.606

### CritPT (Critical Thinking / Reasoning)
- **What it measures:** Critical thinking, logical reasoning, and analytical capabilities.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** Indicates how well a model can analyze arguments, identify fallacies, and reason logically.
- **Current range (24 models):** 0.003 — 0.271

### MMMU Pro (Massive Multi-discipline Multimodal Understanding — Professional)
- **What it measures:** Multimodal understanding across professional-level tasks (images + text reasoning).
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** Tests vision-language capabilities at expert level. Only available for models with multimodal support.
- **Coverage:** 12/24 models (multimodal models only)
- **Current range:** 0.687 — 0.824

### LCR (Long Context Retrieval)
- **What it measures:** Ability to retrieve and use information from very long contexts.
- **Scale:** 0.0 to 1.0 (accuracy score)
- **Why it matters:** Critical for applications processing long documents, where the model must find relevant information in extensive text.
- **Current range (24 models):** 0.658 — 0.977 (note: overlaps with Tau2 range, may be related)

### Omniscience
- **What it measures:** Broad factual knowledge across diverse domains.
- **Scale:** Higher is better (appears to be a count or index score)
- **Why it matters:** Indicates the breadth of the model's training knowledge.
- **Current range (24 models):** ~12.9 — 20.1

---

## Sparsely Available Benchmarks

The following benchmarks are only available for a subset of models (typically 3 or fewer in our dataset):

### AIME / AIME25
- **What it measures:** American Invitational Mathematics Examination problems.
- **Scale:** 0.0 to 1.0
- **Coverage:** 0-3/24 models
- **Why it matters:** Competitive math benchmark; AIME25 is a newer, harder variant.

### HumanEval
- **What it measures:** Function-level code generation from docstrings (OpenAI benchmark).
- **Scale:** 0.0 to 1.0 (pass@k score)
- **Coverage:** 0/24 models in current dataset
- **Why it matters:** Classic coding benchmark for simple function implementation.

### LiveCodeBench
- **What it measures:** Live coding competition problems (similar to competitive programming).
- **Scale:** 0.0 to 1.0
- **Coverage:** 3/24 models
- **Why it matters:** Tests coding under time pressure with fresh, unseen problems.

### MMLU Pro
- **What it measures:** Professional version of Massive Multitask Language Understanding.
- **Scale:** 0.0 to 1.0
- **Coverage:** 3/24 models
- **Why it matters:** Tests knowledge across 57 subjects at professional difficulty.

### Math-500
- **What it measures:** 500 challenging math problems spanning multiple difficulty levels.
- **Scale:** 0.0 to 1.0
- **Coverage:** 0/24 models in current dataset
- **Why it matters:** Diverse math benchmark covering algebra, geometry, calculus, etc.

### Multilingual AA
- **What it measures:** Performance across multiple languages (Artificial Analysis variant).
- **Scale:** 0.0 to 1.0
- **Coverage:** 0/24 models in current dataset
- **Why it matters:** Important for non-English applications.

---

## Cost & Performance Metrics

### Input Price
- **Unit:** USD per 1 million input tokens
- **Why it matters:** Cost of sending prompts to the model.

### Output Price
- **Unit:** USD per 1 million output tokens
- **Why it matters:** Cost of receiving generated text from the model.

### Blended Price (3:1)
- **Unit:** USD per 1 million tokens
- **Calculation:** Weighted average assuming 3 input tokens for every 1 output token.
- **Why it matters:** Best single metric for estimating total API costs.

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

---

## Methodology

Artificial Analysis independently evaluates models by:
- Running benchmarks themselves (not relying on lab-reported numbers)
- Using standardized prompts and evaluation protocols
- Testing on held-out or proprietary test sets where possible
- Updating benchmarks regularly as new, harder tests are developed

For the most current methodology, visit: https://artificialanalysis.ai
