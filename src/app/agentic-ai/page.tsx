"use client";

import { useState, useMemo } from "react";
import { ModelBenchmarkChart } from "@/components/ModelBenchmarkChart";
import aiModels from "@/data/ai-models.json";
import { ExternalLink, DollarSign, BarChart3 } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Metric definitions
// ---------------------------------------------------------------------------
interface MetricDef {
  key: string;
  label: string;
  description: string;
  testBadge: string;
}

const METRICS: MetricDef[] = [
  {
    key: "intelligenceIndex",
    label: "Overall Intelligence",
    description: "Aggregate across all benchmarks",
    testBadge: "AA Index",
  },
  {
    key: "codingIndex",
    label: "Coding Ability",
    description: "Programming and software development",
    testBadge: "AA Coding",
  },
  {
    key: "agenticIndex",
    label: "Agentic Capability",
    description: "Planning, tool use, multi-step reasoning",
    testBadge: "AA Agentic",
  },
  {
    key: "gpqa",
    label: "Graduate-Level Science Q&A",
    description: "PhD-level biology, chemistry, physics",
    testBadge: "GPQA",
  },
  {
    key: "hle",
    label: "Humanity's Last Exam",
    description: "Near-frontier expert knowledge",
    testBadge: "HLE",
  },
  {
    key: "scicode",
    label: "Scientific Code Generation",
    description: "Code for research problems",
    testBadge: "SciCode",
  },
  {
    key: "gdpval",
    label: "Validation Quality",
    description: "Overall model quality and robustness",
    testBadge: "GDPval",
  },
  {
    key: "ifbench",
    label: "Instruction Following",
    description: "Complex instruction adherence",
    testBadge: "IFBench",
  },
  {
    key: "tau2",
    label: "Output Consistency",
    description: "Reliable and consistent outputs",
    testBadge: "Tau-2",
  },
  {
    key: "terminalbenchHard",
    label: "Terminal / System Operations",
    description: "Command-line and system tasks",
    testBadge: "TerminalBench",
  },
  {
    key: "critpt",
    label: "Critical Thinking",
    description: "Logical reasoning and analysis",
    testBadge: "CritPT",
  },
  {
    key: "mmmuPro",
    label: "Multimodal Understanding",
    description: "Vision + text at professional level",
    testBadge: "MMMU Pro",
  },
  {
    key: "omniscience",
    label: "Broad Knowledge",
    description: "Factual knowledge breadth",
    testBadge: "Omniscience",
  },
  {
    key: "lcr",
    label: "Long Context Retrieval",
    description: "Finding info in very long texts",
    testBadge: "LCR",
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

export default function AgenticAIPage() {
  const models = aiModels.models;
  const [selectedMetric, setSelectedMetric] = useState("intelligenceIndex");
  const [priceMode, setPriceMode] = useState<"price" | "cost">("price");

  const lastUpdated = new Date(aiModels.lastUpdated).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const currentMetric = METRICS.find((m) => m.key === selectedMetric) || METRICS[0];

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

      {/* Main layout: metric selector left, chart right */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left: Metric Selector */}
        <aside className="w-full shrink-0 lg:w-80">
          <div className="sticky top-6">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Select Metric
              </h2>
            </div>

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

            {/* Price mode toggle */}
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

        {/* Right: Chart */}
        <main className="min-w-0 flex-1">
          <ModelBenchmarkChart
            models={models}
            selectedMetric={selectedMetric}
            priceMode={priceMode}
            metricLabel={currentMetric.label}
          />
          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-600">
            Click any point to open the model page on Artificial Analysis.
          </p>
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
