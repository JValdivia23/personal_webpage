"use client";

import { useState, useMemo } from "react";
import { ModelBenchmarkChart } from "@/components/ModelBenchmarkChart";
import aiModels from "@/data/ai-models.json";
import {
  ExternalLink,
  DollarSign,
  BarChart3,
  BookOpen,
  Info,
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
  xAI: "#000000",
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
  Unknown: "#9ca3af",
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || "#9ca3af";
}

const METRICS: MetricDef[] = [
  {
    key: "intelligenceIndex",
    label: "Overall Intelligence",
    description: "Aggregate across all benchmarks",
    testBadge: "AA Index",
    scale: "Higher is better (current leader ~60)",
    fullDescription:
      "The single best metric for comparing overall model capability. Computed as the average of all intelligence evaluation benchmarks measured independently by Artificial Analysis, including GPQA, HLE, SciCode, IFBench, Tau2, TerminalBench Hard, CritPT, and others.",
  },
  {
    key: "codingIndex",
    label: "Coding Ability",
    description: "Programming and software development",
    testBadge: "AA Coding",
    scale: "Higher is better",
    fullDescription:
      "Average of coding-specific benchmarks including HumanEval, LiveCodeBench, SciCode, and others. Critical for developers choosing models for code generation, debugging, and software engineering tasks.",
  },
  {
    key: "agenticIndex",
    label: "Agentic Capability",
    description: "Planning, tool use, multi-step reasoning",
    testBadge: "AA Agentic",
    scale: "Higher is better",
    fullDescription:
      "Average of agentic capabilities benchmarks. Measures the model's ability to act as an autonomous agent — planning, tool use, multi-step reasoning, and task completion. Important for applications where the model needs to perform complex workflows or operate autonomously.",
  },
  {
    key: "gpqa",
    label: "Graduate-Level Science Q&A",
    description: "PhD-level biology, chemistry, physics",
    testBadge: "GPQA",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Performance on the most challenging 198 questions from GPQA Diamond, where PhD experts achieve 65% accuracy but skilled non-experts only reach 34% despite web access. Multiple-choice questions at PhD level. A score above 0.85 indicates strong scientific reasoning.",
    officialUrl: "https://artificialanalysis.ai/evaluations/gpqa-diamond",
  },
  {
    key: "hle",
    label: "Humanity's Last Exam",
    description: "Near-frontier expert knowledge",
    testBadge: "HLE",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Performance on 2,500 expert-vetted questions designed to be the final closed-ended academic evaluation, near the frontier of human knowledge. One of the hardest existing benchmarks — even top models score below 0.5, leaving significant headroom.",
    officialUrl: "https://artificialanalysis.ai/evaluations/humanitys-last-exam",
  },
  {
    key: "scicode",
    label: "Scientific Code Generation",
    description: "Code for research problems",
    testBadge: "SciCode",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Scientist-curated coding benchmark featuring 288 test-set subproblems from 80 laboratory problems across 16 scientific disciplines. Tests the intersection of coding ability and scientific understanding, important for research automation.",
    officialUrl: "https://artificialanalysis.ai/evaluations/scicode",
  },
  {
    key: "gdpval",
    label: "Validation Quality",
    description: "Overall model quality and robustness",
    testBadge: "GDPval",
    scale: "Higher is better (no fixed upper bound)",
    fullDescription:
      "A validation metric from Artificial Analysis that correlates with overall model quality and robustness. Provides an additional signal of model reliability beyond raw benchmark scores.",
  },
  {
    key: "ifbench",
    label: "Instruction Following",
    description: "Complex instruction adherence",
    testBadge: "IFBench",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Evaluates precise instruction-following generalization on 58 diverse, verifiable out-of-domain constraints that test models' ability to follow specific output requirements. Critical for real-world applications where precise adherence to instructions is required.",
    officialUrl: "https://artificialanalysis.ai/evaluations/ifbench",
  },
  {
    key: "tau2",
    label: "Tau-2 Telecom Agent",
    description: "Dual-control conversational AI benchmark",
    testBadge: "Tau-2",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A dual-control conversational AI benchmark simulating technical support scenarios where both agent and user must coordinate actions to resolve telecom service issues. Tests multi-turn agent coordination and task completion in realistic customer-service dialogues.",
    officialUrl: "https://artificialanalysis.ai/evaluations/tau2-bench",
  },
  {
    key: "terminalbenchHard",
    label: "Terminal / System Operations",
    description: "Command-line and system tasks",
    testBadge: "TerminalBench",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "An agentic benchmark evaluating AI capabilities in terminal environments through software engineering, system administration, and data processing tasks. Tests practical system administration and command-line reasoning abilities.",
    officialUrl: "https://artificialanalysis.ai/evaluations/terminalbench-hard",
  },
  {
    key: "critpt",
    label: "Physics Reasoning",
    description: "Research-level physics reasoning",
    testBadge: "CritPT",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "A benchmark designed to test LLMs on research-level physics reasoning tasks, featuring 71 composite research challenges. Tests advanced scientific reasoning in physics beyond standard textbook problems.",
    officialUrl: "https://artificialanalysis.ai/evaluations/critpt",
  },
  {
    key: "mmmuPro",
    label: "Multimodal Understanding",
    description: "Vision + text at professional level",
    testBadge: "MMMU Pro",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "An enhanced MMMU benchmark that eliminates shortcuts and guessing strategies to more rigorously test multimodal models across 30 academic disciplines. Tests vision-language capabilities at expert level. Only available for models with multimodal support.",
    officialUrl: "https://artificialanalysis.ai/evaluations/mmmu-pro",
  },
  {
    key: "omniscience",
    label: "Knowledge & Hallucination",
    description: "Factual knowledge and hallucination",
    testBadge: "Omniscience",
    scale: "Higher is better (can be negative)",
    fullDescription:
      "Measures factual recall and hallucination across various economically relevant domains. Indicates the breadth of the model's training knowledge and its tendency to hallucinate.",
    officialUrl: "https://artificialanalysis.ai/evaluations/omniscience",
  },
  {
    key: "lcr",
    label: "Long Context Retrieval",
    description: "Finding info in very long texts",
    testBadge: "LCR",
    scale: "0.0 to 1.0 (accuracy)",
    fullDescription:
      "Ability to retrieve and use information from very long contexts. Critical for applications processing long documents, where the model must find relevant information in extensive text.",
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
              width={130}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: any) => {
                const num = Number(value);
                const formatted =
                  !isNaN(num) && num < 10
                    ? num.toFixed(3)
                    : String(Math.round(num));
                return [formatted, metricLabel];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-600">
        Sorted by score (highest first). Colors indicate model provider.
      </p>
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
// Main page
// ---------------------------------------------------------------------------
export default function AgenticAIPage() {
  const models = aiModels.models;
  const [selectedMetric, setSelectedMetric] = useState("intelligenceIndex");
  const [priceMode, setPriceMode] = useState<"price" | "cost">("price");
  const [sidebarTab, setSidebarTab] = useState<"metrics" | "docs">("metrics");

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

  // Availability counts
  const availability = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of METRICS) {
      counts[m.key] = countAvailable(models, m.key);
    }
    return counts;
  }, [models]);

  // Recent releases (last 90 days)
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
              <button
                onClick={() => setSidebarTab("metrics")}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                  sidebarTab === "metrics"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Select Metric
              </button>
              <button
                onClick={() => setSidebarTab("docs")}
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
            <div className="space-y-1">
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
                      {avail < models.length && (
                        <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                          {avail} of {models.length} models
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
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                {priceMode === "price"
                  ? "Blended price assuming 3 input tokens for every 1 output token."
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
                models={models}
                selectedMetric={selectedMetric}
                priceMode={priceMode}
                metricLabel={currentMetric.label}
              />
              <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-600">
                Click any point to open the model page on Artificial Analysis.
              </p>
            </>
          ) : (
            <DocumentationPanel metric={currentMetric} models={models} />
          )}
        </main>
      </div>

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
