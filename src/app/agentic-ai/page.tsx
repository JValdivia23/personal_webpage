"use client";

import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { ModelBenchmarkChart } from "@/components/ModelBenchmarkChart";
import aiModels from "@/data/ai-models.json";
import { getBenchmarkCost, getCostDescription, getCostScope } from "@/lib/ai-model-costs";
import {
  ExternalLink,
  DollarSign,
  BarChart3,
  BookOpen,
  Info,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Metric definitions
// ---------------------------------------------------------------------------
interface MetricDef {
  key: string;
  label: string;
  description: string;
  testBadge: string;
  scale: string;
  fullDescription: string;
  officialUrl?: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#d97757",
  Google: "#4285f4",
  DeepSeek: "#4f46e5",
  Kimi: "#f59e0b",
  xAI: "#6b7280",
  Meta: "#06b6d4",
  Mistral: "#f97316",
  NVIDIA: "#76b900",
  Alibaba: "#ff6a00",
  "Moonshot AI": "#8b5cf6",
  MiniMax: "#ec4899",
  "01.AI": "#14b8a6",
  "Zhipu AI": "#6366f1",
  Xiaomi: "#ff6900",
  "Z AI": "#6366f1",
  Tencent: "#0052d9",
  SpaceXAI: "#6b7280",
  Unknown: "#9ca3af",
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || "#9ca3af";
}

function formatContextWindow(tokens: number | null): string {
  if (tokens == null) return "N/A";
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return millions % 1 === 0 ? `${millions.toFixed(0)}M` : `${millions.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const thousands = tokens / 1_000;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}k` : `${thousands.toFixed(1)}k`;
  }
  return String(tokens);
}

const METRICS: MetricDef[] = [
  {
    key: "intelligenceIndex",
    label: "Overall Intelligence",
    description: "Official v5.0 composite across knowledge work, coding, science, and general capability",
    testBadge: "AA v5.0",
    scale: "Higher is better; compare only within the same index version",
    fullDescription:
      "Artificial Analysis Intelligence Index v5.0 incorporates nine evaluations in four equally weighted categories: Knowledge Work 25% (AA-Briefcase v1.1 15%, AutomationBench-AA 5%, GDP.pdf 5%); Coding 25% (FrontierCode 2.0 15%, Terminal-Bench 4.0 10%); Science 25% (Terminal-Bench-Science 0.1 15%, CritPt v2 hard subset 10%); General 25% (AA-Omniscience v1.1 accuracy 10% and non-hallucination 5%, HLE-Diamond 10%). 60% of the index uses private test sets or held-out answers. GDPval-AA, SciCode, and AA-LCR were removed from the index. We use AA's published overall score, not an average of our local category reconstructions. Scores and evaluation costs are not directly comparable with v4.3. Models without a v5 score remain tracked and unranked; missing is not zero.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking",
  },
  {
    key: "codingIndex",
    label: "Coding Ability",
    description: "Locally derived v5 category: 60% FrontierCode 2.0 + 40% Terminal-Bench 4.0",
    testBadge: "Local v5",
    scale: "Higher is better (0–100)",
    fullDescription:
      "Locally derived from Intelligence Index v5's Coding category: (60% FrontierCode 2.0 + 40% Terminal-Bench 4.0) × 100, reflecting their 15% and 10% overall weights. Both component scores are required. FrontierCode 2.0 uses 132 private repository-change tasks with three attempts in Stirrup; Terminal-Bench 4.0 uses 66 terminal tasks with pass@1 over three repeats. This is not an official published composite and is not AA's separate Coding Agent Index. It does not fall back to FrontierCode 1.1 or the retired SciCode-based v4.3 formula.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking",
  },
  {
    key: "knowledgeWorkIndex",
    label: "Knowledge Work",
    description: "Locally derived v5 category: deliverables, SaaS workflows, and document reasoning",
    testBadge: "Local v5",
    scale: "Higher is better (0–100)",
    fullDescription:
      "Locally derived as (60% normalized AA-Briefcase v1.1 + 20% AutomationBench-AA + 20% GDP.pdf) × 100, matching the v5 Knowledge Work category's 15/5/5 overall weights. Briefcase Elo is normalized with clamp((Elo − 500) / 2000). All three components are required. This uses the current payload's Briefcase Elo, not AA's frozen-at-addition snapshot, so it is a local reconstruction rather than an official published category score. It replaces the old Agentic menu option; the legacy v4.3 Agentic field remains in the data for compatibility. GDPval-AA is now standalone and is not used here.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking",
  },
  {
    key: "scienceIndex",
    label: "Scientific Capability",
    description: "Locally derived v5 category: research workflows and tool-assisted physics",
    testBadge: "Local v5",
    scale: "Higher is better (0–100)",
    fullDescription:
      "Locally derived as (60% Terminal-Bench-Science 0.1 + 40% CritPt v2 hard subset) × 100, matching their 15% and 10% overall v5 weights. Both scores are required. Tests terminal-based scientific research workflows and difficult physics problems solved with a Python tool. This is not an official published composite and never substitutes legacy CritPt or Terminal-Bench 4.0 for these separate evaluations.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking#science",
  },
  {
    key: "generalIndex",
    label: "General Capability",
    description: "Locally derived v5 category: knowledge reliability and HLE-Diamond",
    testBadge: "Local v5",
    scale: "Higher is better (0–100)",
    fullDescription:
      "Locally derived as (40% AA-Omniscience v1.1 accuracy + 20% non-hallucination rate + 40% HLE-Diamond) × 100, matching the v5 General category's 10/5/10 overall weights. Non-hallucination is one minus the source hallucination rate. All three inputs are required; the Omniscience headline Index is not a substitute for its accuracy and hallucination components. This is a local reconstruction, not an official published composite.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking#general",
  },
  {
    key: "frontierCode20",
    label: "Repository Coding",
    description: "Private open-source repository changes graded for merge readiness",
    testBadge: "FrontierCode 2.0",
    scale: "0.0 to 1.0 (task score)",
    fullDescription:
      "Cognition's FrontierCode 2.0 comprises 132 private tasks in real open-source repositories. AA runs three attempts per task in Stirrup. Held-out tests and a rubric grade merge readiness; failing a blocking check or being flagged for looking up a solution scores zero. Other attempts receive weighted rubric scores. Part of Intelligence Index v5 Coding (15%). This is separate from FrontierCode 1.1 and coding-agent/harness leaderboards.",
    officialUrl: "https://artificialanalysis.ai/evaluations/frontiercode-2-0",
  },
  {
    key: "terminalbenchScience",
    label: "Scientific Research Workflows",
    description: "70 terminal-based research tasks across five scientific domains",
    testBadge: "Terminal-Bench-Science",
    scale: "0.0 to 1.0 (accuracy, pass@1)",
    fullDescription:
      "Terminal-Bench-Science 0.1.0 contains 70 expert-curated research workflow tasks: 19 life sciences, 17 physical sciences, 17 mathematical sciences, 9 engineering sciences, and 8 earth sciences. AA uses mini-swe-agent with up to 1,000 steps, averaging pass@1 across three repeats. A task passes only if every verification test passes. Part of Intelligence Index v5 Science (15%); distinct from Terminal-Bench 4.0.",
    officialUrl: "https://artificialanalysis.ai/evaluations/terminal-bench-science",
  },
  {
    key: "hleDiamond",
    label: "HLE-Diamond",
    description: "Refined exam: 500 reasoning and 500 knowledge questions",
    testBadge: "HLE-Diamond",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "The refined 1,000-question Humanity's Last Exam from CAIS and Scale AI, split evenly between reasoning and knowledge. Includes 272 image questions, with images supplied to image-capable models. AA evaluates without tools, using pass@1 and an equality-checker judge. Part of Intelligence Index v5 General (10%). Scores are not directly comparable with the legacy 2,158-question text-only HLE evaluation, which remains a separate metric.",
    officialUrl: "https://artificialanalysis.ai/evaluations/hle-diamond",
  },
  {
    key: "critptV2Hard",
    label: "Tool-Assisted Physics Reasoning",
    description: "Private 40-question hard subset of CritPt v2 with Python tools",
    testBadge: "CritPt v2 Hard",
    scale: "0.0 to 1.0 (accuracy, pass@1)",
    fullDescription:
      "The fixed hard subset contains 40 of CritPt v2's 70 research-level physics problems, excluding 30 solved in every attempt by seven frontier models at launch. AA runs models in Stirrup with an offline Python sandbox for up to 50 turns, with five repeats scored by the official grading server. Part of Intelligence Index v5 Science (10%). This is not the full 70-question CritPt v2 score or legacy tool-free CritPt.",
    officialUrl: "https://artificialanalysis.ai/evaluations/critpt-v2?critpt-subset=hard",
  },
  {
    key: "code2videoElo",
    label: "Video Creation in Code",
    description: "Design short product and brand videos using HTML and animation code",
    testBadge: "Code2Video-AA",
    scale: "Elo rating (higher is better)",
    fullDescription:
      "AA's implementation of HeyGen's Code2Video Bench evaluates 114 design briefs (39 public, 75 private). Each model writes a HyperFrames HTML/GSAP composition in one call without tools; the rendered videos are compared by a Gemini 4 Argon judge on engagement, prompt intent, composition, temporal consistency, and craft. Overall Elo is the mean of five axis ratings, anchored to GPT-5.5 (xhigh) at 1000. Confidence intervals reflect comparison sampling, not repeated task runs. Tests designing videos in code, not native video generation. This is standalone: it is not included in Intelligence Index v5 or our category composites. Its cost modes use separate local estimates from AA's contestant token counts and API prices, excluding judging and rendering, never Intelligence Index costs.",
    officialUrl: "https://artificialanalysis.ai/evaluations/code2video-aa",
  },
  {
    key: "gpqa",
    label: "Graduate-Level Science Q&A",
    description: "PhD-level biology, chemistry, physics — Google-proof questions",
    testBadge: "GPQA",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "The most challenging 198 questions from GPQA, where PhD experts achieve 65% accuracy but skilled non-experts only reach 34% despite web access. These graduate-level physics, biology, and chemistry questions are designed to be 'Google-proof' and require genuine scientific expertise rather than search skills. Included in Intelligence Index through v4.1; moved to legacy evaluations in v4.3. A score above 0.85 indicates strong scientific reasoning. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/gpqa-diamond",
  },
  {
    key: "hle",
    label: "Humanity's Last Exam",
    description: "Legacy text-only exam; replaced in v5 by HLE-Diamond",
    testBadge: "Legacy HLE",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Legacy Humanity's Last Exam: AA evaluates 2,158 text-only expert-vetted questions across mathematics, sciences, and humanities without tools. A collaborative effort by CAIS and Scale AI. Included through Intelligence Index v4.3.2, then replaced by HLE-Diamond in v5. Retained as a separate historical evaluation; scores must not be substituted for or directly compared with HLE-Diamond.",
    officialUrl: "https://artificialanalysis.ai/evaluations/humanitys-last-exam",
  },
  {
    key: "scicode",
    label: "Scientific Code Generation",
    description: "Scientist-curated coding benchmark with real laboratory problems",
    testBadge: "Legacy SciCode",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A scientist-curated coding benchmark featuring 288 test-set subproblems from 80 laboratory problems across 16 disciplines. Requires integrating scientific knowledge with programming. Removed from the Intelligence Index in v5 and retained as a legacy evaluation; no longer used in our Coding category. AA currently marks SciCode as under review. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/scicode",
  },
  {
    key: "gdpval",
    label: "GDPval-AA Leaderboard",
    description: "Real-world tasks across 44 occupations",
    testBadge: "GDPval",
    scale: "ELO rating (higher is better)",
    fullDescription:
      "GDPval-AA v2.1 tests real-world tasks across 44 occupations and 9 industries using Stirrup, with shell access and web browsing. The 220-task public dataset requires documents, slides, diagrams, and spreadsheets. Elo is fitted with Crowd-BT and anchored to DeepSeek V4.1 Flash (max) at 1600. Removed from the Intelligence Index in v5; retained as a standalone evaluation, not part of the Knowledge Work composite.",
    officialUrl: "https://artificialanalysis.ai/evaluations/gdpval-aa",
  },
  {
    key: "ifbench",
    label: "Instruction Following",
    description: "Precise instruction-following on 58 diverse, verifiable constraints",
    testBadge: "IFBench",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A benchmark evaluating precise instruction-following generalization on 294 diverse, verifiable out-of-domain constraints. Included in Intelligence Index through v4.1; moved to additional evaluations in v4.3. Developed by the Allen Institute for AI. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/ifbench",
  },
  {
    key: "tau2",
    label: "Tau-2 Telecom Agent",
    description: "Dual-control conversational AI benchmark for technical support",
    testBadge: "Tau-2",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A dual-control conversational AI benchmark simulating technical support scenarios where both agent and user must coordinate actions to resolve telecom service issues. 𝜏²-Bench (Tau-2 Bench) introduces a new paradigm for evaluating conversational AI by simulating both the agent and user to actively modify a shared world state. The telecom domain tests agents' abilities to guide users through technical troubleshooting to test problem-solving and effective communication skills. Developed by Sierra Research, this benchmark addresses gaps between other benchmarks and real-world customer service scenarios where users are active participants in problem resolution. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/tau2-bench",
  },
  {
    key: "terminalbenchHard",
    label: "Terminal / System Operations",
    description: "Agentic tasks in terminal environments (hard subset)",
    testBadge: "TerminalBench",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "An agentic benchmark evaluating AI capabilities in terminal environments through software engineering, system administration, and data processing tasks. Terminal-Bench is a comprehensive benchmark developed by Stanford University and the Laude Institute for evaluating AI agents in realistic terminal environments. The 'hard' subset contains challenging tasks that test agents' abilities to compile code, train models, configure servers, play games, and debug systems in representative scenarios for real-world problems and terminal use patterns. Tasks cover a wide range of engineering, game playing, and system administration tasks that are unlikely to be pattern-matched on training data. Outcomes are evaluated programmatically with verification scripts executed in the agent's Docker environment, requiring agents to successfully meet a range of output conditions. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/terminalbench-hard",
  },
  {
    key: "critpt",
    label: "Physics Reasoning",
    description: "Research-level physics reasoning across 11 subfields",
    testBadge: "Legacy CritPt",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Legacy CritPt comprises 70 test challenges plus one example across 11 physics subfields, with guess-resistant numerical, symbolic, and Python-function answers. Included through Intelligence Index v4.3.2. Replaced in v5 by CritPt v2's private 40-question hard subset with code execution. Retained here as a separate evaluation; legacy scores never fill missing CritPt v2 hard results.",
    officialUrl: "https://artificialanalysis.ai/evaluations/critpt",
  },
  {
    key: "mmmuPro",
    label: "Multimodal Understanding",
    description: "Enhanced multimodal benchmark across 30 academic disciplines",
    testBadge: "MMMU Pro",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "An enhanced MMMU benchmark that eliminates shortcuts and guessing strategies to more rigorously test multimodal models across 30 academic disciplines. MMMU-Pro addresses limitations in the original MMMU through a three-step enhancement process: filtering out questions answerable by text-only models, expanding multiple-choice options from 4 to 10, and introducing a vision-only input format where questions are embedded within screenshots or photos. The benchmark contains 3,460 questions across six core disciplines (Art & Design, Business, Science, Health & Medicine, Humanities & Social Science, and Tech & Engineering) and requires models to simultaneously process visual and textual information in a more realistic setting. Performance results show substantial drops across all tested models compared to the original MMMU, demonstrating the benchmark's effectiveness in exposing current limitations in multimodal AI systems. Only available for models with multimodal support. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/mmmu-pro",
  },
  {
    key: "omniscience",
    label: "Knowledge & Hallucination",
    description: "Updated knowledge reliability evaluation: 3,000 questions across 42 topics",
    testBadge: "Omniscience v1.1",
    scale: "-100 to 100 (higher is better, can be negative)",
    fullDescription:
      "AA-Omniscience v1.1 measures knowledge reliability over 3,000 questions across 42 topics. The update removes saturated and public v1 questions, adds new questions, and revises ambiguous or erroneous items. The headline Index ranges from −100 to 100, rewarding correct answers and penalizing hallucinations while leaving abstentions neutral. v5 uses accuracy (10%) and one minus hallucination rate (5%) as separate inputs, not the headline Index. Scores are not directly comparable with the previous 6,000-question v1 dataset.",
    officialUrl: "https://artificialanalysis.ai/evaluations/omniscience",
  },
  {
    key: "lcr",
    label: "Long Context Reasoning",
    description: "Extract, reason, and synthesize from long documents (10k–100k tokens)",
    testBadge: "Legacy LCR",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "AA-LCR v1.1 measures reasoning over long documents (10k–100k tokens): 100 questions across academic papers, financials, legal documents, and reports, scored by an equality-checker LLM with pass@1 over three repeats. Removed from the Intelligence Index in v5; retained as a legacy evaluation. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning",
  },
  {
    key: "tauBanking",
    label: "Banking Tool Use",
    description: "Fintech customer-support agent navigating knowledge bases and tool calls",
    testBadge: "τ³-Banking",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A fintech customer-support benchmark from the 𝜏-Knowledge framework that tests whether agents can navigate a large unstructured knowledge base and execute multi-step tool calls to resolve realistic banking workflows. Included in Intelligence Index v4.1; moved to additional evaluations in v4.3. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/tau3-banking",
  },
  {
    key: "terminalbenchV21",
    label: "Terminal / System Ops v2.1",
    description: "Verified refresh of Terminal-Bench v2.0 — 89 curated agentic tasks",
    testBadge: "TerminalBench v2.1",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A verified refresh of Terminal-Bench v2.0 — 89 curated tasks across software engineering, system administration, data processing, model training, and security, with environment and instruction fixes so scores reflect agent capability rather than environment gaps. Included in Intelligence Index v4.1; superseded in the index by Terminal-Bench v4.0 in v4.3. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/terminalbench-v2-1",
  },
  {
    key: "terminalbenchV40",
    label: "Terminal / System Ops v4.0",
    description: "66-task terminal suite — Intelligence Index v5 coding component",
    testBadge: "TerminalBench v4.0",
    scale: "0.0 to 1.0 (accuracy, pass@1)",
    fullDescription:
      "Terminal-Bench 4.0 is a coding evaluation in Intelligence Index v5 (10% of the index). AA uses mini-swe-agent for 66 terminal-based tasks, scoring test-suite pass/fail with pass@1 across three repeats. Distinct from Terminal-Bench-Science and the retired Terminal-Bench 2.1. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/terminalbench-4-0",
  },
  {
    key: "gdpPdfAllPass",
    label: "GDP.pdf Document Q&A",
    description: "Free-form answers grounded in long PDFs across 10 domains",
    testBadge: "GDP.pdf",
    scale: "0.0 to 1.0 (all-pass rate)",
    fullDescription:
      "GDP.pdf tests free-form answers grounded in long professional documents: 100 tasks across 10 domains, with five repeats. The headline metric is all-pass rate. Models receive extracted text and, when supported, page images; no browsing or tools. Part of Intelligence Index v5 Knowledge Work (5%), reduced from its 10% weight in v4.3. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/gdp-pdf",
  },
  {
    key: "mlcrOverall",
    label: "Medical Long Context",
    description: "Expert + compound medical questions over long context (MLCR-AA)",
    testBadge: "MLCR-AA",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "MLCR-AA (Medical Long Context Reasoning) is an additional evaluation (not in the Intelligence Index) with 60 questions across expert and compound tiers. Scoring uses a conciseness gate plus a 3-judge majority vote on completeness and accuracy, pass@1 over 3 repeats. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/mlcr-aa",
  },
  {
    key: "analystAgent",
    label: "Analyst Agent",
    description: "Agentic Python analysis across 14 domains (AA-AnalystAgent)",
    testBadge: "AnalystAgent",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "AA-AnalystAgent is an additional agentic evaluation (not in the Intelligence Index): 80 tasks across 14 domains. The agent writes and executes Python and produces a free-form final answer, graded by an LLM judge with a numeric pre-check override (pass^5 over 5 repeats). All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/aa-analyst-agent",
  },
  {
    key: "automationBench",
    label: "SaaS Workflow Automation",
    description: "Agentic task completion across simulated SaaS app environments (657 tasks)",
    testBadge: "AutomationBench",
    scale: "0.0 to 1.0 (share of objectives completed)",
    fullDescription:
      "Measures completion of 657 private SaaS workflow tasks across six domains using simulated Gmail, Google Sheets, Slack, Salesforce, Zendesk, Jira, and HubSpot. One run per task, up to 50 turns. Scores the share of objectives completed, with zero credit if any guardrail is violated. Developed by Zapier; evaluated independently by AA. Part of Intelligence Index v5 Knowledge Work (5%).",
    officialUrl: "https://artificialanalysis.ai/evaluations/automationbench-aa",
  },
  {
    key: "enterpriseOpsGym",
    label: "Enterprise Operations",
    description: "Stateful, multi-step enterprise workflows across 8 business domains",
    testBadge: "EnterpriseOps-Gym",
    scale: "0.0 to 1.0 (task completion rate)",
    fullDescription:
      "Artificial Analysis' independent implementation of ServiceNow's EnterpriseOps-Gym, an agentic benchmark testing whether LLM agents can complete stateful, multi-step enterprise workflows across eight business domains via live tool use, graded on the final state of the underlying databases. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/enterprise-ops-gym-aa",
  },
  {
    key: "harveyLabAllPass",
    label: "Legal Agent Work",
    description: "Real-world legal work across 24 practice areas (120 private tasks)",
    testBadge: "Harvey LAB",
    scale: "0.0 to 1.0 (task all-pass rate)",
    fullDescription:
      "Artificial Analysis' implementation of Harvey's Legal Agent Benchmark (LAB), testing AI agents on real-world legal work from Harvey's dataset of 120 private tasks spanning 24 legal practice areas. The agent reads case documents in a sandbox and produces legal deliverables (e.g., memos, disclosure schedules, deposition summaries), graded criterion-by-criterion by a single LLM rubric judge. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/harvey-lab-aa",
  },
  {
    key: "apexAgents",
    label: "Professional Services Agents",
    description: "Long-horizon, cross-application tasks in professional-services environments",
    testBadge: "APEX-Agents",
    scale: "0.0 to 1.0 (task completion rate)",
    fullDescription:
      "Artificial Analysis' implementation of the APEX-Agents benchmark, testing AI agents on long-horizon, cross-application tasks in professional-services environments with realistic application tooling. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/apex-agents-aa",
  },
  {
    key: "itBenchSre",
    label: "Kubernetes Incident Analysis",
    description: "Root-cause analysis of Kubernetes incidents from offline snapshots",
    testBadge: "ITBench",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Artificial Analysis' implementation of IBM's ITBench benchmark, testing AI agents on Kubernetes incident root-cause analysis from offline incident snapshots. The agent inspects alerts, events, traces, and topology and identifies the contributing-factor entities (deployments, pods, namespaces, network policies, etc.) responsible for the failure. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/itbench-aa",
  },
  {
    key: "briefcaseElo",
    label: "Knowledge Work Deliverables",
    description: "Agentic knowledge work producing spreadsheets, presentations, and memos",
    testBadge: "AA-Briefcase",
    scale: "Elo rating (higher is better)",
    fullDescription:
      "AA-Briefcase v1.1 tests realistic multi-week knowledge-work projects: 91 tasks across four scenarios with thousands of source files. Combined Elo aggregates rubric success, analytical quality, and presentation quality using Crowd-BT fitting and judge panels. Part of Intelligence Index v5 Knowledge Work (15%). For AA's overall index, Elo is frozen at addition and normalized with clamp((Elo − 500) / 2000). Our local Knowledge Work reconstruction uses the current source Elo, not the frozen snapshot.",
    officialUrl: "https://artificialanalysis.ai/evaluations/aa-briefcase",
  },
];

// ---------------------------------------------------------------------------
// Helper: count models with data for a metric
// ---------------------------------------------------------------------------
function countAvailable(models: any[], key: string): number {
  return models.filter((m) => {
    const v = m[key];
    return v != null && typeof v === "number";
  }).length;
}

// ---------------------------------------------------------------------------
// Custom tooltip for bar chart (matches scatter plot style)
// ---------------------------------------------------------------------------
function BarTooltip({
  active,
  payload,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: any }>;
  metricLabel: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <div className="mb-1 font-semibold text-white">{d.name}</div>
      <div className="text-xs text-gray-400">{d.provider}</div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">{metricLabel}:</span>
          <span className="font-medium text-blue-400">
            {typeof d.value === "number" ? d.value.toFixed(3) : d.value}
          </span>
        </div>
        {d.code2videoEloInterval && (
          <div className="text-gray-400">
            95% CI: {d.code2videoEloInterval.lower.toFixed(1)}–{d.code2videoEloInterval.upper.toFixed(1)}
          </div>
        )}
        {d.blendedPrice != null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Blended Price:</span>
            <span className="font-medium text-emerald-400">
              ${d.blendedPrice.toFixed(2)}/1M
            </span>
          </div>
        )}
        {d.inputPrice != null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Input:</span>
            <span className="text-gray-300">${d.inputPrice.toFixed(2)}/1M</span>
          </div>
        )}
        {d.outputPrice != null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Output:</span>
            <span className="text-gray-300">${d.outputPrice.toFixed(2)}/1M</span>
          </div>
        )}
        {d.benchmarkCostToRun != null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">{d.costScope} total:</span>
            <span className="font-medium text-emerald-400">
              ${d.benchmarkCostToRun.toFixed(0)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Context:</span>
          <span className="font-medium text-amber-400">
            {formatContextWindow(d.contextWindow)}
          </span>
        </div>
        {d.isOpenWeights && (
          <div className="mt-1 inline-block rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
            Open Weights
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini bar chart for documentation view
// ---------------------------------------------------------------------------
function MiniBarChart({
  models,
  metricKey,
  metricLabel,
}: {
  models: any[];
  metricKey: string;
  metricLabel: string;
}) {
  const [highlightedProvider, setHighlightedProvider] = useState<string | null>(null);

  const data = useMemo(() => {
    return models
      .filter((m) => {
        const v = m[metricKey];
        return v != null && typeof v === "number";
      })
      .map((m) => ({
        name: m.shortName,
        value: m[metricKey] as number,
        provider: m.provider,
        color: getProviderColor(m.provider),
        inputPrice: m.inputPrice,
        outputPrice: m.outputPrice,
        blendedPrice: m.blendedPrice,
        benchmarkCostToRun: getBenchmarkCost(m, metricKey, "cost"),
        costScope: getCostScope(metricKey),
        code2videoEloInterval: metricKey === "code2videoElo" ? m.code2videoEloInterval : null,
        contextWindow: m.contextWindow,
        isOpenWeights: m.isOpenWeights,
      }))
      .sort((a, b) => b.value - a.value);
  }, [models, metricKey]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No data available for this metric.
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const niceMax = maxValue * 1.05;

  const providers = Array.from(new Set(data.map((d) => d.provider))).sort();

  const handleProviderHover = (provider: string) => setHighlightedProvider(provider);
  const handleProviderLeave = () => setHighlightedProvider(null);

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        Model Rankings — {metricLabel}
      </h4>
      <div className="h-[500px] w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              type="number"
              domain={[0, niceMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v < 10 ? v.toFixed(2) : String(Math.round(v))
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <Tooltip
              content={<BarTooltip metricLabel={metricLabel} />}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry, index) => {
                const isHighlighted = !highlightedProvider || highlightedProvider === entry.provider;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={isHighlighted ? 1 : 0.2}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Provider legend — hover to highlight */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {providers.map((provider) => {
          const isHighlighted = highlightedProvider === provider;
          const isDimmed = highlightedProvider !== null && !isHighlighted;
          const color = getProviderColor(provider);
          return (
            <button
              key={provider}
              onMouseEnter={() => handleProviderHover(provider)}
              onMouseLeave={handleProviderLeave}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border ${
                isDimmed
                  ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500"
                  : isHighlighted
                    ? "border-transparent bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white shadow-sm"
                    : "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={`Highlight ${provider}`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isDimmed ? "#d1d5db" : color,
                }}
              />
              {provider}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documentation panel
// ---------------------------------------------------------------------------
function DocumentationPanel({
  metric,
  models,
}: {
  metric: MetricDef;
  models: any[];
}) {
  const avail = countAvailable(models, metric.key);
  const total = models.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {metric.label}
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {metric.testBadge}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {metric.scale}
            </span>
          </div>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {metric.fullDescription}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          {avail} of {total} models evaluated
        </span>
        {metric.officialUrl && (
          <Link
            href={metric.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
          >
            <ExternalLink className="h-3 w-3" />
            Official benchmark page
          </Link>
        )}
      </div>

      <MiniBarChart
        models={models}
        metricKey={metric.key}
        metricLabel={metric.label}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model filter panel (collapsible, provider-grouped toggle chips)
// ---------------------------------------------------------------------------
function ModelFilterPanel({
  models,
  hiddenModelIds,
  setHiddenModelIds,
  showModelPanel,
  setShowModelPanel,
}: {
  models: any[];
  hiddenModelIds: Set<string>;
  setHiddenModelIds: Dispatch<SetStateAction<Set<string>>>;
  showModelPanel: boolean;
  setShowModelPanel: Dispatch<SetStateAction<boolean>>;
}) {
  // Group models by provider, sorted by model count desc then name
  const byProvider = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const m of models) {
      (groups[m.provider] ??= []).push(m);
    }
    return Object.entries(groups).sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return a[0].localeCompare(b[0]);
    });
  }, [models]);

  const activeCount = models.length - hiddenModelIds.size;

  const toggleModel = (id: string) => {
    setHiddenModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProvider = (providerModels: any[]) => {
    const allHidden = providerModels.every((m) => hiddenModelIds.has(m.id));
    setHiddenModelIds((prev) => {
      const next = new Set(prev);
      if (allHidden) {
        providerModels.forEach((m) => next.delete(m.id));
      } else {
        providerModels.forEach((m) => next.add(m.id));
      }
      return next;
    });
  };

  const selectAll = () => setHiddenModelIds(new Set());
  const clearAll = () => setHiddenModelIds(new Set(models.map((m) => m.id)));

  return (
    <div className="mb-12 mt-8">
      {/* Collapsible header */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
        <button
          onClick={() => setShowModelPanel(!showModelPanel)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showModelPanel ? "" : "-rotate-90"}`}
          />
          Models
        </button>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {activeCount} of {models.length} active
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <button
            onClick={selectAll}
            className="font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            Select All
          </button>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <button
            onClick={clearAll}
            className="font-medium text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {showModelPanel && (
        <div className="mt-3 space-y-3">
          {byProvider.map(([provider, providerModels]) => {
            const providerActive = providerModels.filter(
              (m) => !hiddenModelIds.has(m.id)
            ).length;
            const allHidden = providerActive === 0;
            return (
              <div
                key={provider}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/30"
              >
                {/* Provider header */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: getProviderColor(provider) }}
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {provider}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {providerActive}/{providerModels.length}
                  </span>
                  <button
                    onClick={() => toggleProvider(providerModels)}
                    className="ml-auto text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    {allHidden ? "Show all" : "Hide all"}
                  </button>
                </div>
                {/* Model chips grid */}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                  {providerModels.map((m) => {
                    const active = !hiddenModelIds.has(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModel(m.id)}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                          active
                            ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                            : "border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-600 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        {active ? (
                          <Eye className="h-3 w-3 shrink-0" />
                        ) : (
                          <EyeOff className="h-3 w-3 shrink-0 opacity-60" />
                        )}
                        <span className="truncate">{m.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default-hidden models & filter versioning
// ---------------------------------------------------------------------------
// Bump FILTER_VERSION whenever new models should be hidden by default.
// On version mismatch, the saved selection is merged with the new defaults
// (preserving saved hidden IDs, but reapplying default-hidden IDs). On version match, the saved
// selection is loaded as-is.
const FILTER_VERSION = 15;
const DEFAULT_HIDDEN_IDS: Set<string> = new Set([
  // GPT-5.6 Sol variants (high/medium/low/non-reasoning hidden; max visible, xhigh hidden)
  "gpt-5-6-sol-high",
  "gpt-5-6-sol-medium",
  "gpt-5-6-sol-low",
  "gpt-5-6-sol-non-reasoning",
  "gpt-5-6-sol-xhigh",
  // GPT-5.6 Terra variants
  "gpt-5-6-terra-high",
  "gpt-5-6-terra-medium",
  "gpt-5-6-terra-low",
  "gpt-5-6-terra-non-reasoning",
  "gpt-5-6-terra-xhigh",
  // GPT-5.6 Luna variants
  "gpt-5-6-luna-high",
  "gpt-5-6-luna-medium",
  "gpt-5-6-luna-low",
  "gpt-5-6-luna-non-reasoning",
  "gpt-5-6-luna-xhigh",
  // GPT-6 Sol/Luna variants (only max stays visible per branch)
  "gpt-6-sol-xhigh",
  "gpt-6-sol-high",
  "gpt-6-sol-medium",
  "gpt-6-sol-low",
  "gpt-6-sol-non-reasoning",
  "gpt-6-luna-xhigh",
  "gpt-6-luna-high",
  "gpt-6-luna-medium",
  "gpt-6-luna-low",
  "gpt-6-luna-non-reasoning",
  // GPT-6 Astra variants (only max stays visible)
  "gpt-6-astra-xhigh",
  "gpt-6-astra-high",
  "gpt-6-astra-medium",
  "gpt-6-astra-low",
  // Lower-performing / older models (hidden by default, enable to compare)
  "deepseek-v3-2-reasoning",
  "mimo-v2-pro",
  "mimo-v2-omni",
  "qwen3-6-plus",
  "kimi-k2-5",
  "minimax-m2-5",
  "minimax-m2-7",
  "grok-4-20",
  "grok-4-3",
  "gemini-3-1-pro-preview",
  "glm-5-1",
  // Gemini 3.7 Flash variants (only the high effort stays visible)
  "gemini-3-7-flash-medium",
  "gemini-3-7-flash-low",
  // Qwen3.8 2.4T A95B overlaps Qwen3.8 Max (same base model, similar scores)
  "qwen3-8-2-4t-a95b",
  // Claude Fable 5.1 medium — hidden, xhigh/max visible (max is #1 leader)
  "claude-fable-5-1-medium",
  // Gemini 3.8 Flash variants — only high stays visible (matches 3.7 pattern)
  "gemini-3-8-flash-medium",
  "gemini-3-8-flash-low",
  // Grok 4.7 high — 0.12 below xhigh, hidden as near-duplicate
  "grok-4-7-high",
  // Claude Opus 5.5 medium/low — hidden, max/xhigh/high visible (new top-3 sweep)
  "claude-opus-5-5-medium",
  "claude-opus-5-5-low",
  // Claude Sonnet 5.5 lower efforts — hidden, max only visible
  "claude-sonnet-5-5-xhigh",
  "claude-sonnet-5-5-high",
  "claude-sonnet-5-5-medium",
  "claude-sonnet-5-5-low",
  // Claude Haiku 5.5 lower efforts — hidden, max only visible
  "claude-haiku-5-5-xhigh",
  "claude-haiku-5-5-high",
  "claude-haiku-5-5-medium",
  "claude-haiku-5-5-low",
  // GPT-6.1 Sol lower efforts — hidden, max only visible
  "gpt-6-1-sol-xhigh",
  "gpt-6-1-sol-high",
  "gpt-6-1-sol-medium",
  "gpt-6-1-sol-low",
  // Superseded generations — hidden, enable to compare
  "deepseek-v4-flash",
  "deepseek-v4-flash-vision",
  "gemini-3-5-flash",
  "gemini-3-6-flash",
  "grok-4-5",
  // Qwen3.8 Max — too expensive, overlaps 27B/2.4T family
  "qwen3-8-max",
  // No longer relevant — superseded by newer releases
  "nvidia-nemotron-3-super-120b-a12b",
  "gpt-oss-120b",
]);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AgenticAIPage() {
  const models = aiModels.models;
  const [selectedMetric, setSelectedMetric] = useState("intelligenceIndex");
  const [priceMode, setPriceMode] = useState<"price" | "cost" | "task">("price");
  const [sidebarTab, setSidebarTab] = useState<"metrics" | "docs">("metrics");
  const [hiddenModelIds, setHiddenModelIds] = useState<Set<string>>(new Set());
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [showModelPanel, setShowModelPanel] = useState(false);

  // Load hidden-model selection from localStorage on mount.
  // Versioned: when FILTER_VERSION bumps, merge the new DEFAULT_HIDDEN_IDS
  // into the user's saved hidden IDs. This does not preserve enabled overrides
  // for models that remain default-hidden across a version change.
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem("filterVersion");
      const savedHidden = localStorage.getItem("hiddenModelIds");
      if (savedVersion === String(FILTER_VERSION) && savedHidden) {
        // Same version — respect the user's saved selection as-is
        setHiddenModelIds(new Set(JSON.parse(savedHidden)));
      } else {
        // New version or first visit — apply defaults, preserving any
        // existing user-hidden IDs so customizations aren't lost.
        let preserved = new Set<string>();
        if (savedHidden) {
          try {
            preserved = new Set(JSON.parse(savedHidden));
          } catch {
            // invalid JSON — start fresh
          }
        }
        const merged = new Set([...preserved, ...DEFAULT_HIDDEN_IDS]);
        setHiddenModelIds(merged);
        localStorage.setItem("filterVersion", String(FILTER_VERSION));
        localStorage.setItem("hiddenModelIds", JSON.stringify([...merged]));
      }
    } catch {
      // localStorage unavailable — fall back to defaults in-memory
      setHiddenModelIds(new Set(DEFAULT_HIDDEN_IDS));
    }
    setFiltersLoaded(true);
  }, []);

  // Persist hidden-model selection to localStorage
  useEffect(() => {
    // Do not overwrite saved choices with the initial empty set before loading.
    if (!filtersLoaded) return;
    try {
      localStorage.setItem("hiddenModelIds", JSON.stringify([...hiddenModelIds]));
    } catch {
      // localStorage unavailable — selection still works in-session
    }
  }, [hiddenModelIds, filtersLoaded]);

  const lastUpdated = new Date(aiModels.lastUpdated).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const currentMetric =
    METRICS.find((m) => m.key === selectedMetric) || METRICS[0];
  const v5EvaluatedCount = countAvailable(models, "intelligenceIndex");

  // Models currently visible (not hidden by the user). Charts, availability
  // counts, and the documentation panel all use this filtered set.
  // Recent Releases intentionally uses the full `models` set.
  const activeModels = useMemo(
    () => models.filter((m) => !hiddenModelIds.has(m.id)),
    [models, hiddenModelIds]
  );

  // Availability counts
  const availability = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of METRICS) {
      counts[m.key] = countAvailable(activeModels, m.key);
    }
    return counts;
  }, [activeModels]);

  // Recent releases (last 90 days) — always uses the full model set,
  // independent of the active/hidden toggle.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentReleases = models
    .filter((m) => m.releaseDate && new Date(m.releaseDate) >= ninetyDaysAgo)
    .sort(
      (a, b) =>
        new Date(b.releaseDate!).getTime() -
        new Date(a.releaseDate!).getTime()
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Agentic AI Benchmarks
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Interactive cost-vs-performance comparisons of frontier AI models.
          Automatically synced from{" "}
          <Link
            href="https://artificialanalysis.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Artificial Analysis
          </Link>
          .
        </p>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <p>
            <strong>Intelligence Index v{aiModels.intelligenceIndexVersion}:</strong>{" "}
            {v5EvaluatedCount} of {models.length} tracked models have an overall v5 score.
            Models without one remain available for individual benchmarks; missing results are not zero.
            Scores and evaluation costs are not directly comparable with v4.3.
          </p>
          <p className="mt-1 text-xs">
            Category scores are locally derived. Code2Video-AA is a separate evaluation,
            not part of v5, and uses its own estimated API costs.
          </p>
        </div>
      </div>

      {/* Main layout: sidebar left, content right */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left: Sidebar */}
        <aside className="w-full shrink-0 lg:w-80">
          <div className="sticky top-6">
            {/* Tab switcher */}
            <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              <div className="relative flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white">
                <BarChart3 className="h-3.5 w-3.5" />
                Select Metric
              </div>
              <button
                onClick={() => setSidebarTab(sidebarTab === "docs" ? "metrics" : "docs")}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                  sidebarTab === "docs"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Documentation
              </button>
            </div>

            {/* Metric list (shown in both tabs, but more prominent in metrics tab) */}
            <div className="space-y-1 lg:max-h-[680px] lg:overflow-y-auto lg:pr-1">
              {METRICS.map((metric) => {
                const isActive = selectedMetric === metric.key;
                const avail = availability[metric.key];
                return (
                  <button
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key)}
                    className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    {/* Active indicator bar */}
                    <div
                      className={`mt-1.5 h-6 w-1 shrink-0 rounded-full transition-colors ${
                        isActive
                          ? "bg-blue-500"
                          : "bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {metric.label}
                        </span>
                        <span className="inline-flex shrink-0 items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {metric.testBadge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {metric.description}
                      </p>
                      {avail < activeModels.length && (
                        <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                          {avail} of {activeModels.length} models
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Price mode toggle (only relevant for plot view, but keep visible) */}
            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cost Basis
                </h2>
              </div>
              <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  onClick={() => setPriceMode("price")}
                  className={`relative flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    priceMode === "price"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Price / 1M tokens
                </button>
                <button
                  onClick={() => setPriceMode("cost")}
                  className={`relative flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    priceMode === "cost"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Total cost to run
                </button>
                <button
                  onClick={() => setPriceMode("task")}
                  className={`relative flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    priceMode === "task"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Cost per task
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                {getCostDescription(selectedMetric, priceMode)}
              </p>
            </div>
          </div>
        </aside>

        {/* Right: Content area */}
        <main className="min-w-0 flex-1">
          {sidebarTab === "metrics" ? (
            <>
              <ModelBenchmarkChart
                models={activeModels}
                selectedMetric={selectedMetric}
                priceMode={priceMode}
                metricLabel={currentMetric.label}
              />
              <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-600">
                Click any point to open the model page on Artificial Analysis.
              </p>
            </>
          ) : (
            <DocumentationPanel metric={currentMetric} models={activeModels} />
          )}
        </main>
      </div>

      {/* Model filter panel (collapsible) — toggles which models appear in the charts */}
      <ModelFilterPanel
        models={models}
        hiddenModelIds={hiddenModelIds}
        setHiddenModelIds={setHiddenModelIds}
        showModelPanel={showModelPanel}
        setShowModelPanel={setShowModelPanel}
      />

      {/* Recent Releases */}
      {recentReleases.length > 0 && (
        <section className="mb-12 mt-16">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Recent Releases
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentReleases.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900 dark:text-white">
                    {model.shortName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {model.provider} ·{" "}
                    {model.releaseDate
                      ? new Date(model.releaseDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "Unknown date"}
                  </div>
                </div>
                <Link
                  href={model.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer / Attribution */}
      <footer className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <p>
          Data sourced from{" "}
          <Link
            href="https://artificialanalysis.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Artificial Analysis
          </Link>
          . Last updated: {lastUpdated}.
        </p>
        <p className="mt-1 text-xs">
          Prices are per 1M tokens. Evaluation costs refer to Intelligence Index v{aiModels.intelligenceIndexVersion},
          except Code2Video-AA, which uses separate contestant API cost estimates.
        </p>
      </footer>
    </div>
  );
}
