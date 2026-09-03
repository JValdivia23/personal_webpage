"use client";

import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { ModelBenchmarkChart } from "@/components/ModelBenchmarkChart";
import aiModels from "@/data/ai-models.json";
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
    description: "Weighted composite across agents, coding, general reasoning, and scientific reasoning",
    testBadge: "AA Index",
    scale: "Higher is better (current leader ~60)",
    fullDescription:
      "Artificial Analysis Intelligence Index v4.0 combines a comprehensive suite of 10 evaluation datasets to assess language model capabilities across reasoning, knowledge, maths and programming. It is calculated as a weighted average across four categories, each contributing 25% to the overall score: Agents (GDPval-AA 16.7%, 𝜏²-Bench Telecom 8.3%), Coding (Terminal-Bench Hard 16.7%, SciCode 8.3%), General (AA-LCR 6.25%, AA-Omniscience 12.5%, IFBench 6.25%), and Scientific Reasoning (HLE 12.5%, GPQA Diamond 6.25%, CritPt 6.25%). Artificial Analysis estimates a 95% confidence interval of less than ±1% based on experiments with >10 repeats on certain models. The Intelligence Index is a text-only, English language evaluation suite; multimodal and multilingual performance are benchmarked separately. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking",
  },
  {
    key: "codingIndex",
    label: "Coding Ability",
    description: "Weighted average of coding benchmarks in the Intelligence Index",
    testBadge: "AA Coding",
    scale: "Higher is better",
    fullDescription:
      "Represents the weighted average of coding benchmarks in the Artificial Analysis Intelligence Index: Terminal-Bench Hard (66.7%) and SciCode (33.3%). Terminal-Bench Hard evaluates agentic capabilities in terminal environments through software engineering, system administration, and data processing tasks. SciCode tests scientific code generation with 288 test-set subproblems from 80 laboratory problems across 16 scientific disciplines. Critical for developers choosing models for code generation, debugging, and software engineering tasks. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking",
  },
  {
    key: "agenticIndex",
    label: "Agentic Capability",
    description: "Average of agentic capabilities benchmarks in the Intelligence Index",
    testBadge: "AA Agentic",
    scale: "Higher is better",
    fullDescription:
      "Represents the average of agentic capabilities benchmarks in the Artificial Analysis Intelligence Index: GDPval-AA and 𝜏²-Bench Telecom. GDPval-AA tests AI models on real-world tasks across 44 occupations and 9 major industries via an agentic loop with shell access and web browsing. 𝜏²-Bench Telecom is a dual-control conversational AI benchmark simulating technical support scenarios where both agent and user must coordinate actions. Measures the model's ability to act as an autonomous agent — planning, tool use, multi-step reasoning, and task completion. Important for applications where the model needs to perform complex workflows or operate autonomously. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/methodology/intelligence-benchmarking",
  },
  {
    key: "gpqa",
    label: "Graduate-Level Science Q&A",
    description: "PhD-level biology, chemistry, physics — Google-proof questions",
    testBadge: "GPQA",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "The most challenging 198 questions from GPQA, where PhD experts achieve 65% accuracy but skilled non-experts only reach 34% despite web access. These graduate-level physics, biology, and chemistry questions are designed to be 'Google-proof' and require genuine scientific expertise rather than search skills. They can only be consistently solved by domain experts with PhDs, making them ideal for testing true scientific reasoning capabilities. A score above 0.85 indicates strong scientific reasoning. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/gpqa-diamond",
  },
  {
    key: "hle",
    label: "Humanity's Last Exam",
    description: "Frontier-level benchmark across mathematics, sciences, and humanities",
    testBadge: "HLE",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A frontier-level benchmark with 2,500 expert-vetted questions across mathematics, sciences, and humanities, designed to be the final closed-ended academic evaluation. A collaborative effort by the Center for AI Safety involving over 1,000 contributors to create frontier-level academic questions that challenge current AI capabilities. The 2,500 expert-vetted questions are designed to be 'Google-proof' and require genuine understanding rather than information retrieval, serving as the intended final closed-ended academic benchmark. One of the hardest existing benchmarks — even top models score below 0.5, leaving significant headroom. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/humanitys-last-exam",
  },
  {
    key: "scicode",
    label: "Scientific Code Generation",
    description: "Scientist-curated coding benchmark with real laboratory problems",
    testBadge: "SciCode",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A scientist-curated coding benchmark featuring 288 test set subproblems from 80 laboratory problems across 16 scientific disciplines. Unlike traditional coding benchmarks, SciCode requires integrating scientific knowledge with programming skills to solve real research problems rather than abstract puzzles. The benchmark was developed by domain experts across 16 diverse natural science sub-fields, including mathematics, physics, chemistry, biology, and materials science. Problems naturally factorize into multiple subproblems, each involving knowledge recall, reasoning, and code synthesis. It offers optional descriptions specifying useful scientific background information and scientist-annotated gold-standard solutions and test cases for evaluation. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/scicode",
  },
  {
    key: "gdpval",
    label: "GDPval-AA Leaderboard",
    description: "Real-world tasks across 44 occupations",
    testBadge: "GDPval",
    scale: "ELO rating (higher is better)",
    fullDescription:
      "Artificial Analysis' evaluation framework for OpenAI's GDPval dataset. Tests AI models on real-world tasks across 44 occupations and 9 major industries. Models are given shell access and web browsing capabilities in an agentic loop via Stirrup to solve tasks, with ELO ratings derived from blind pairwise comparisons. The GDPval gold public dataset includes 220 tasks developed by OpenAI in collaboration with industry professionals, requiring models to produce diverse outputs including documents, slides, diagrams, and spreadsheets.",
    officialUrl: "https://artificialanalysis.ai/evaluations/gdpval-aa",
  },
  {
    key: "ifbench",
    label: "Instruction Following",
    description: "Precise instruction-following on 58 diverse, verifiable constraints",
    testBadge: "IFBench",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A benchmark evaluating precise instruction-following generalization on 58 diverse, verifiable out-of-domain constraints that test models' ability to follow specific output requirements. IFBench addresses the problem that current language models strongly overfit to a small set of verifiable constraints and cannot generalize well to unseen output constraints, a critical skill for practical AI applications. The benchmark introduces 58 new, diverse, and challenging verifiable constraints to test precise instruction-following generalization, going beyond existing benchmarks that focus on a limited set of constraint types. Developed by the Allen Institute for AI, IFBench uses reinforcement learning with verifiable rewards (RLVR) to improve instruction following and includes 29 additional hand-annotated training constraints with verification functions. All evaluations are conducted independently by Artificial Analysis.",
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
    testBadge: "CritPT",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A benchmark designed to test LLMs on research-level physics reasoning tasks, featuring 71 composite research challenges. CritPt evaluates language models on solving unpublished, frontier-level physics problems that require genuine research-scale reasoning. The benchmark comprises 71 challenges (70 test challenges and one example), created by over 50 active physics researchers across 30 institutions and spanning 11 physics subfields including condensed matter, quantum physics, astrophysics, high energy physics, and biophysics. Each problem underwent extensive review (averaging 40+ hours per challenge) and uses 'guess-resistant' answer formats including floating-point arrays, symbolic expressions, and Python functions. Leading models in 2025 achieve only single-digit accuracy, highlighting the substantial gap between current AI capabilities and research-level physics reasoning. All evaluations are conducted independently by Artificial Analysis.",
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
    description: "Factual recall and hallucination across 6 economically relevant domains",
    testBadge: "Omniscience",
    scale: "-100 to 100 (higher is better, can be negative)",
    fullDescription:
      "A benchmark measuring factual recall and hallucination across various economically relevant domains. AA-Omniscience is a knowledge and hallucination benchmark that rewards accuracy, punishes bad guesses, and provides a comprehensive view of which models produce factually reliable outputs across different domains. The benchmark contains 6,000 questions across 6 major domains, derived from authoritative academic and industry sources and generated automatically using an LLM-based question generation agent to ensure unambiguity, scalability, and factual precision. The evaluation measures a model's AA-Omniscience Index, a bounded metric (-100 to 100) measuring factual recall that jointly penalizes hallucinations and rewards abstention when uncertain, with 0 equating to a model that answers questions correctly as much as it does incorrectly. Performance varies by domain, with models from three different research labs leading across the six domains. This suggests models should be chosen according to the demands of the use case rather than general performance for tasks where knowledge is important. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/omniscience",
  },
  {
    key: "lcr",
    label: "Long Context Reasoning",
    description: "Extract, reason, and synthesize from long documents (10k–100k tokens)",
    testBadge: "LCR",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A challenging benchmark measuring language models' ability to extract, reason about, and synthesize information from long-form documents ranging from 10k to 100k tokens (measured using the cl100k_base tokenizer). Long-form text comprehension represents an under-studied class of evaluations where humans dramatically outscore language models, despite expanding context windows in current AI systems. LCR features 100 questions across diverse document types including academic papers, company financials, government consultations, legal documents, industry reports, and marketing materials, requiring genuine reasoning rather than simple data extraction. Each question demands multi-step reasoning to synthesize information from dispersed sections, understand complex domain-specific content, and produce unambiguous answers that mid-2024 frontier models achieve less than 50% accuracy on. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning",
  },
  {
    key: "tauBanking",
    label: "Banking Tool Use",
    description: "Fintech customer-support agent navigating knowledge bases and tool calls",
    testBadge: "τ³-Banking",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A fintech customer-support benchmark from the 𝜏-Knowledge framework that tests whether agents can navigate a large unstructured knowledge base and execute multi-step tool calls to resolve realistic banking workflows. Part of the Artificial Analysis Intelligence Index v4.1. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/tau3-banking",
  },
  {
    key: "terminalbenchV21",
    label: "Terminal / System Ops v2.1",
    description: "Verified refresh of Terminal-Bench v2.0 — 89 curated agentic tasks",
    testBadge: "TerminalBench v2.1",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A verified refresh of Terminal-Bench v2.0 — 89 curated tasks across software engineering, system administration, data processing, model training, and security, with environment and instruction fixes so scores reflect agent capability rather than environment gaps. Part of the Artificial Analysis Intelligence Index v4.1. All evaluations are conducted independently by Artificial Analysis.",
    officialUrl: "https://artificialanalysis.ai/evaluations/terminalbench-v2-1",
  },
  {
    key: "automationBench",
    label: "SaaS Workflow Automation",
    description: "Agentic task completion across simulated SaaS app environments (657 tasks)",
    testBadge: "AutomationBench",
    scale: "0.0 to 1.0 (share of objectives completed)",
    fullDescription:
      "A benchmark measuring agentic task completion across simulated SaaS application environments, scoring the share of each task's objectives completed without guardrail violations. The benchmark covers 657 tasks across six business domains (Finance, HR, Marketing, Operations, Sales, Support) using simulated environments for applications including Gmail, Google Sheets, Slack, Salesforce, Zendesk, Jira, and HubSpot. Developed by Zapier. All evaluations are conducted independently by Artificial Analysis.",
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
      "A private evaluation developed by Artificial Analysis for frontier agentic capability in long-horizon knowledge work, testing agents on realistic business workflows that require deliverables such as spreadsheets, presentations, and memos. AA-Briefcase Elo is a combined metric that aggregates rubric pass rate, analytical quality Elo and presentation Elo. All evaluations are conducted independently by Artificial Analysis.",
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
  if (d.value === 0) return null; // hidden provider

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
        {d.costToRunIndex != null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Cost to Run Index:</span>
            <span className="font-medium text-emerald-400">
              ${d.costToRunIndex.toFixed(0)}
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
        costToRunIndex: m.costToRunIndex,
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
// (preserving any user-customized toggles). On version match, the saved
// selection is loaded as-is.
const FILTER_VERSION = 9;
const DEFAULT_HIDDEN_IDS: Set<string> = new Set([
  // GPT-5.6 Sol variants (max/high/medium/low/non-reasoning)
  "gpt-5-6-sol",
  "gpt-5-6-sol-high",
  "gpt-5-6-sol-medium",
  "gpt-5-6-sol-low",
  "gpt-5-6-sol-non-reasoning",
  // GPT-5.6 Terra variants
  "gpt-5-6-terra",
  "gpt-5-6-terra-high",
  "gpt-5-6-terra-medium",
  "gpt-5-6-terra-low",
  "gpt-5-6-terra-non-reasoning",
  // GPT-5.6 Luna variants
  "gpt-5-6-luna",
  "gpt-5-6-luna-high",
  "gpt-5-6-luna-medium",
  "gpt-5-6-luna-low",
  "gpt-5-6-luna-non-reasoning",
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
  const [showModelPanel, setShowModelPanel] = useState(false);

  // Load hidden-model selection from localStorage on mount.
  // Versioned: when FILTER_VERSION bumps, merge the new DEFAULT_HIDDEN_IDS
  // into the user's saved selection (preserving their custom toggles).
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
  }, []);

  // Persist hidden-model selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hiddenModelIds", JSON.stringify([...hiddenModelIds]));
    } catch {
      // localStorage unavailable — selection still works in-session
    }
  }, [hiddenModelIds]);

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
                {priceMode === "price"
                  ? "Blended price assuming 7:2:1 ratio of cache hits, input, and output tokens."
                  : priceMode === "task"
                    ? "Median API cost per Intelligence Index task (plotted on a log scale — efficient models span three orders of magnitude)."
                    : "Total API cost to evaluate the model on the full benchmark suite."}
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
          Prices shown are per 1M tokens. Cost to Run is the total expense to
          evaluate the model on the Artificial Analysis Intelligence Index.
        </p>
      </footer>
    </div>
  );
}
