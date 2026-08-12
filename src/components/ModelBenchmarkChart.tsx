'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AIModel {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  intelligenceIndex: number | null;
  codingIndex: number | null;
  agenticIndex: number | null;
  mathIndex: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  blendedPrice: number | null;
  costToRunIndex: number | null;
  isOpenWeights: boolean | null;
  url: string;
  gpqa: number | null;
  hle: number | null;
  scicode: number | null;
  gdpval: number | null;
  ifbench: number | null;
  tau2: number | null;
  terminalbenchHard: number | null;
  critpt: number | null;
  mmmuPro: number | null;
  omniscience: number | null;
  lcr: number | null;
  contextWindow: number | null;
  tauBanking: number | null;
  terminalbenchV21: number | null;
  automationBench: number | null;
  enterpriseOpsGym: number | null;
  harveyLabAllPass: number | null;
  apexAgents: number | null;
  itBenchSre: number | null;
  briefcaseElo: number | null;
}

interface ModelBenchmarkChartProps {
  models: AIModel[];
  selectedMetric: string;
  priceMode: 'price' | 'cost';
  metricLabel: string;
}

interface ChartPoint extends AIModel {
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
}

// ---------------------------------------------------------------------------
// Provider color palette (dark-theme friendly)
// ---------------------------------------------------------------------------
const PROVIDER_COLORS: Record<string, string> = {
  'OpenAI': '#10a37f',
  'Anthropic': '#d97757',
  'Google': '#4285f4',
  'DeepSeek': '#4f46e5',
  'Kimi': '#f59e0b',
  'xAI': '#6b7280',
  'Meta': '#06b6d4',
  'Mistral': '#f97316',
  'NVIDIA': '#76b900',
  'Alibaba': '#ff6a00',
  'Moonshot AI': '#8b5cf6',
  'MiniMax': '#ec4899',
  '01.AI': '#14b8a6',
  'Zhipu AI': '#6366f1',
  'Xiaomi': '#ff6900',
  'Z AI': '#6366f1',
  'Unknown': '#9ca3af',
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || '#9ca3af';
}

function formatContextWindow(tokens: number | null): string {
  if (tokens == null) return 'N/A';
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    // Show 1 decimal if not a whole number, e.g. 1.5M
    return millions % 1 === 0 ? `${millions.toFixed(0)}M` : `${millions.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const thousands = tokens / 1_000;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}k` : `${thousands.toFixed(1)}k`;
  }
  return String(tokens);
}

// ---------------------------------------------------------------------------
// Quadrant background colours (subtle, dark-theme friendly)
// ---------------------------------------------------------------------------
const QUADRANT_BG = {
  topLeft:   { fill: '#22c55e', opacity: 0.06 },
  topRight:  { fill: '#f59e0b', opacity: 0.06 },
  bottomLeft:{ fill: '#3b82f6', opacity: 0.06 },
  bottomRight:{ fill: '#ef4444', opacity: 0.06 },
};

// ---------------------------------------------------------------------------
// Collision-aware label placement with 8 directions
// ---------------------------------------------------------------------------
interface LabelPlacement {
  dx: number;
  dy: number;
}

/** Candidate offsets in pixels from dot centre.
 *  Order = fallback priority.  Right-side first, then top/bottom,
 *  then longer right, then left (only if near left edge).           */
const CANDIDATES = [
  // — right side (preferred) —
  { dx: 10, dy: 0 },      // immediately right
  { dx: 10, dy: -10 },    // 45° up-right
  { dx: 10, dy: 10 },     // 45° down-right
  { dx: 18, dy: 0 },      // further right
  { dx: 18, dy: -18 },    // further up-right
  { dx: 18, dy: 18 },     // further down-right
  { dx: 28, dy: 0 },      // even further right
  { dx: 28, dy: -28 },
  { dx: 28, dy: 28 },
  { dx: 40, dy: 0 },
  { dx: 40, dy: -40 },
  { dx: 40, dy: 40 },
  // — top / bottom —
  { dx: 0, dy: -14 },     // immediately top
  { dx: 0, dy: 14 },      // immediately bottom
  { dx: 0, dy: -22 },     // higher top
  { dx: 0, dy: 22 },      // lower bottom
  { dx: 0, dy: -34 },
  { dx: 0, dy: 34 },
  { dx: 0, dy: -48 },
  { dx: 0, dy: 48 },
  // — left side (only near left edge) —
  { dx: -10, dy: 0 },
  { dx: -10, dy: -10 },
  { dx: -10, dy: 10 },
  { dx: -18, dy: 0 },
  { dx: -18, dy: -18 },
  { dx: -18, dy: 18 },
];

function overlaps(
  a: { l: number; r: number; b: number; t: number },
  b: { l: number; r: number; b: number; t: number }
) {
  return a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b;
}

function placeLabels(
  allPoints: ChartPoint[],
  xDomain: [number, number],
  yDomain: [number, number]
): LabelPlacement[] {
  if (allPoints.length === 0) return [];

  const PLOT_W = 800;
  const PLOT_H = 520;
  const xR = xDomain[1] - xDomain[0];
  const yR = yDomain[1] - yDomain[0];

  // Convert data coords → plot pixel coords (SVG-like, Y inverted)
  const toPx = (p: ChartPoint) => ({
    x: ((p.x - xDomain[0]) / xR) * PLOT_W,
    y: PLOT_H - ((p.y - yDomain[0]) / yR) * PLOT_H,
  });

  const pixels = allPoints.map(toPx);

  // Dot boxes in pixels (radius = 5)
  const dotBoxes = pixels.map((p) => ({
    l: p.x - 5,
    r: p.x + 5,
    b: p.y - 5,
    t: p.y + 5,
  }));

  // Process crowded points first
  const order = allPoints
    .map((_, i) => {
      let minD = Infinity;
      for (let j = 0; j < pixels.length; j++) {
        if (i === j) continue;
        const dx = pixels[j].x - pixels[i].x;
        const dy = pixels[j].y - pixels[i].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) minD = d;
      }
      return { idx: i, minD };
    })
    .sort((a, b) => a.minD - b.minD)
    .map((c) => c.idx);

  const placedLabels: Array<{ l: number; r: number; b: number; t: number }> = [];
  const results: LabelPlacement[] = new Array(allPoints.length);

  for (const pi of order) {
    const p = pixels[pi];
    const label = allPoints[pi].shortName || allPoints[pi].name;

    const textW = label.length * 6.2; // px
    const textH = 13; // px

    const nearLeft = p.x / PLOT_W < 0.10;

    let best: LabelPlacement = { dx: 10, dy: 0 };
    let bestScore = Infinity;

    for (const cand of CANDIDATES) {
      if (cand.dx < 0 && !nearLeft) continue;

      // Anchor point in plot pixels
      const ax = p.x + cand.dx;
      const ay = p.y + cand.dy;

      // Text box in pixels (matches CustomScatterShape rendering)
      const isRight = cand.dx > 0 && Math.abs(cand.dx) >= Math.abs(cand.dy);
      const isLeft = cand.dx < 0;

      let box: { l: number; r: number; b: number; t: number };

      if (isRight) {
        box = { l: ax, r: ax + textW, b: ay - textH / 2, t: ay + textH / 2 };
      } else if (isLeft) {
        box = { l: ax - textW, r: ax, b: ay - textH / 2, t: ay + textH / 2 };
      } else {
        box = { l: ax - textW / 2, r: ax + textW / 2, b: ay - textH / 2, t: ay + textH / 2 };
      }

      let score = 0;

      // 1. Must not overlap any dot
      for (const db of dotBoxes) {
        if (overlaps(box, db)) {
          score += 1_000_000;
        }
      }

      // 2. Must not overlap already-placed labels
      for (const lb of placedLabels) {
        if (overlaps(box, lb)) {
          score += 100_000;
        }
      }

      // 3. Prefer shorter distances (labels stay close to their dot)
      const dist = Math.sqrt(cand.dx * cand.dx + cand.dy * cand.dy);
      score += dist * dist * 0.03;

      // 4. Prefer right side
      if (cand.dx < 0) score += 500;
      if (cand.dx === 0) score += 100;

      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    // Record placed label box in pixels
    const ax = p.x + best.dx;
    const ay = p.y + best.dy;
    const isRight = best.dx > 0 && Math.abs(best.dx) >= Math.abs(best.dy);
    const isLeft = best.dx < 0;

    if (isRight) {
      placedLabels.push({ l: ax, r: ax + textW, b: ay - textH / 2, t: ay + textH / 2 });
    } else if (isLeft) {
      placedLabels.push({ l: ax - textW, r: ax, b: ay - textH / 2, t: ay + textH / 2 });
    } else {
      placedLabels.push({ l: ax - textW / 2, r: ax + textW / 2, b: ay - textH / 2, t: ay + textH / 2 });
    }

    results[pi] = best;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Custom Scatter Shape — label at fixed (dx, dy) offset from dot
// ---------------------------------------------------------------------------
function CustomScatterShape(props: any) {
  const { cx, cy, fill, payload, onClick, fillOpacity, strokeOpacity } = props;
  if (cx == null || cy == null) return null;

  const label = payload.shortName || payload.name;
  const dx = payload.dx ?? 10;
  const dy = payload.dy ?? 0;

  const ax = cx + dx;
  const ay = cy + dy;

  // Determine alignment from offset direction
  const isRight = dx > 0 && Math.abs(dx) >= Math.abs(dy);
  const isLeft = dx < 0;

  const textAnchor: 'start' | 'middle' | 'end' = isRight
    ? 'start'
    : isLeft
    ? 'end'
    : 'middle';

  const shapeOpacity = fillOpacity ?? 1;

  return (
    <g style={{ cursor: 'pointer', opacity: shapeOpacity }} onClick={onClick}>
      <line
        x1={cx}
        y1={cy}
        x2={ax}
        y2={ay}
        stroke={fill}
        strokeWidth={1.5}
        strokeDasharray="3 2"
        opacity={0.5}
      />
      <circle cx={cx} cy={cy} r={5} fill={fill} stroke="none" />
      {/* outline */}
      <text
        x={ax}
        y={ay}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill="#000"
        fontSize={10}
        fontWeight={500}
        stroke="#000"
        strokeWidth={2.5}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {label}
      </text>
      {/* fill */}
      <text
        x={ax}
        y={ay}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={10}
        fontWeight={500}
      >
        {label}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({
  active,
  payload,
  priceMode,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  priceMode: 'price' | 'cost';
  metricLabel: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const model = payload[0].payload;
  const xValue = model.x;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <div className="mb-1 font-semibold text-white">{model.shortName}</div>
      <div className="text-xs text-gray-400">{model.provider}</div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">{metricLabel}:</span>
          <span className="font-medium text-blue-400">
            {typeof model.y === 'number' ? model.y.toFixed(3) : model.y}
          </span>
        </div>
        {priceMode === 'price' ? (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Blended Price:</span>
              <span className="font-medium text-emerald-400">
                ${xValue.toFixed(2)}/1M
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Input:</span>
              <span className="text-gray-300">${model.inputPrice?.toFixed(2) ?? 'N/A'}/1M</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Output:</span>
              <span className="text-gray-300">${model.outputPrice?.toFixed(2) ?? 'N/A'}/1M</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Cost to Run Index:</span>
            <span className="font-medium text-emerald-400">
              ${xValue.toFixed(0)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Context:</span>
          <span className="font-medium text-amber-400">
            {formatContextWindow(model.contextWindow)}
          </span>
        </div>
        {model.isOpenWeights && (
          <div className="mt-1 inline-block rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
            Open Weights
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ModelBenchmarkChart({
  models,
  selectedMetric,
  priceMode,
  metricLabel,
}: ModelBenchmarkChartProps) {
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);

  // All valid points (used for stable axes / thresholds)
  const allChartData = useMemo<ChartPoint[]>(() => {
    const raw = models
      .filter((m) => {
        const metricVal = (m as any)[selectedMetric];
        if (metricVal == null || typeof metricVal !== 'number') return false;
        if (priceMode === 'price') {
          if (m.blendedPrice == null || m.blendedPrice === 0) return false;
        }
        if (priceMode === 'cost') {
          if (m.costToRunIndex == null || m.costToRunIndex === 0) return false;
        }
        return true;
      })
      .map((m) => ({
        ...m,
        x: priceMode === 'price' ? (m.blendedPrice ?? 0) : (m.costToRunIndex ?? 0),
        y: (m as any)[selectedMetric] as number,
        color: getProviderColor(m.provider),
        dx: 10,
        dy: 0,
      }));
    raw.sort((a, b) => b.y - a.y);
    return raw;
  }, [models, selectedMetric, priceMode]);

  // Compute axis domains from ALL data so limits stay identical
  const xDomain = useMemo<[number, number]>(() => {
    const vals = allChartData.map((d) => d.x);
    if (vals.length === 0) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15;
    return [Math.max(0, min - pad), max + pad];
  }, [allChartData]);

  const yDomain = useMemo<[number, number]>(() => {
    const vals = allChartData.map((d) => d.y);
    if (vals.length === 0) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.12;
    return [Math.max(0, min - pad), max + pad];
  }, [allChartData]);

  const thresholdX = useMemo(() => {
    if (allChartData.length === 0) return 0;
    const sorted = [...allChartData].sort((a, b) => a.x - b.x);
    const idx = Math.floor(sorted.length * 0.75);
    return sorted[Math.min(idx, sorted.length - 1)].x;
  }, [allChartData]);

  const medianY = useMemo(() => {
    if (allChartData.length === 0) return 0;
    const sorted = [...allChartData].sort((a, b) => a.y - b.y);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1].y + sorted[mid].y) / 2
      : sorted[mid].y;
  }, [allChartData]);

  // Assign collision-aware label placements to ALL data
  const chartDataWithLabels = useMemo<ChartPoint[]>(() => {
    if (allChartData.length === 0) return [];
    const placements = placeLabels(allChartData, xDomain, yDomain);
    return allChartData.map((m, i) => ({
      ...m,
      dx: placements[i].dx,
      dy: placements[i].dy,
    }));
  }, [allChartData, xDomain, yDomain]);

  const providers = useMemo(
    () => Array.from(new Set(allChartData.map((d) => d.provider))).sort(),
    [allChartData]
  );

  const handleProviderHover = (provider: string) => {
    // Touch devices synthesize mouseenter on tap; ignore it there so hover
    // never sticks and click toggling stays the only interaction.
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return;
    setHoveredProvider(provider);
  };
  const handleProviderLeave = () => setHoveredProvider(null);
  const handleProviderClick = (provider: string) => {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };
  // A provider's points are dimmed when a click selection is active and they
  // aren't part of it, or (with nothing selected) when hovering another one.
  const isProviderDimmed = (provider: string): boolean => {
    if (selectedProviders.size > 0) return !selectedProviders.has(provider);
    if (hoveredProvider) return provider !== hoveredProvider;
    return false;
  };

  const xAxisLabel = priceMode === 'price'
    ? 'Blended Price ($ / 1M tokens) →'
    : 'Cost to Run Index ($) →';

  const chartTitle = `Cost vs. ${metricLabel}`;

  if (allChartData.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{chartTitle}</h3>
        </div>
        <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {models.length === 0
              ? "No models selected. Enable models in the filter panel below."
              : "No models have data for this cost mode. Try switching to \u201CCost to Run\u201D."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {chartTitle}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {priceMode === 'price'
            ? `Blended price per 1M tokens vs. ${metricLabel}`
            : `Total cost to run benchmark vs. ${metricLabel}`}
        </p>
      </div>

      {/* Chart */}
      <div className="relative h-[620px] w-full rounded-xl border border-gray-200 bg-white/50 dark:border-gray-800 dark:bg-gray-900/50">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 30, right: 60, bottom: 40, left: 30 }}>
            {/* Quadrant backgrounds */}
            <ReferenceArea
              x1={xDomain[0]}
              x2={thresholdX}
              y1={medianY}
              y2={yDomain[1]}
              fill={QUADRANT_BG.topLeft.fill}
              fillOpacity={QUADRANT_BG.topLeft.opacity}
              stroke="none"
            />
            <ReferenceArea
              x1={thresholdX}
              x2={xDomain[1]}
              y1={medianY}
              y2={yDomain[1]}
              fill={QUADRANT_BG.topRight.fill}
              fillOpacity={QUADRANT_BG.topRight.opacity}
              stroke="none"
            />
            <ReferenceArea
              x1={xDomain[0]}
              x2={thresholdX}
              y1={yDomain[0]}
              y2={medianY}
              fill={QUADRANT_BG.bottomLeft.fill}
              fillOpacity={QUADRANT_BG.bottomLeft.opacity}
              stroke="none"
            />
            <ReferenceArea
              x1={thresholdX}
              x2={xDomain[1]}
              y1={yDomain[0]}
              y2={medianY}
              fill={QUADRANT_BG.bottomRight.fill}
              fillOpacity={QUADRANT_BG.bottomRight.opacity}
              stroke="none"
            />

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-800"
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="text-gray-500 dark:text-gray-400"
              tickFormatter={(v: number) =>
                priceMode === 'price' ? `$${v.toFixed(1)}` : `$${v.toFixed(0)}`
              }
              label={{
                value: xAxisLabel,
                position: 'insideBottomRight',
                offset: -5,
                style: { fill: 'currentColor', fontSize: 12, fontWeight: 600 },
                className: 'text-gray-500 dark:text-gray-400',
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="text-gray-500 dark:text-gray-400"
              tickFormatter={(v: number) => v.toFixed(1)}
              label={{
                value: `${metricLabel} →`,
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'currentColor', fontSize: 12, fontWeight: 600 },
                className: 'text-gray-500 dark:text-gray-400',
              }}
            />
            <Tooltip
              content={<CustomTooltip priceMode={priceMode} metricLabel={metricLabel} />}
              cursor={{ strokeDasharray: '3 3' }}
              wrapperStyle={{ zIndex: 9999 }}
            />

            <ReferenceLine
              x={thresholdX}
              stroke="currentColor"
              strokeDasharray="5 5"
              strokeOpacity={0.35}
              className="text-gray-500 dark:text-gray-500"
            />
            <ReferenceLine
              y={medianY}
              stroke="currentColor"
              strokeDasharray="5 5"
              strokeOpacity={0.35}
              className="text-gray-500 dark:text-gray-500"
            />

            <Scatter
              data={chartDataWithLabels}
              shape={<CustomScatterShape />}
            >
              {chartDataWithLabels.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={entry.color}
                  stroke="#ffffff"
                  fillOpacity={isProviderDimmed(entry.provider) ? 0.2 : 1}
                  strokeOpacity={isProviderDimmed(entry.provider) ? 0.3 : 1}
                  cursor="pointer"
                  onClick={() => {
                    window.open(entry.url, '_blank');
                  }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

      </div>

      {/* Provider legend — hover to peek, click to toggle */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {providers.map((provider) => {
          const isSelected = selectedProviders.has(provider);
          const isDimmed = isProviderDimmed(provider);
          const color = getProviderColor(provider);
          return (
            <button
              key={provider}
              onMouseEnter={() => handleProviderHover(provider)}
              onMouseLeave={handleProviderLeave}
              onClick={() => handleProviderClick(provider)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border ${
                isDimmed
                  ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500"
                  : isSelected
                    ? "border-transparent bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white shadow-sm"
                    : "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={isSelected ? `Hide ${provider}` : `Show ${provider}`}
            >
              {isSelected && (
                <Check className="h-3 w-3" strokeWidth={3} />
              )}
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

      {/* Quadrant explanation */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-gray-500 dark:text-gray-400 sm:grid-cols-4">
        <div className="rounded border border-green-200 bg-green-50/50 p-2 dark:border-green-900/30 dark:bg-green-900/10">
          <strong className="text-green-700 dark:text-green-400">Most Attractive</strong>
          <p className="mt-0.5">High {metricLabel.toLowerCase()}, low cost</p>
        </div>
        <div className="rounded border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/30 dark:bg-amber-900/10">
          <strong className="text-amber-700 dark:text-amber-400">Expensive</strong>
          <p className="mt-0.5">High {metricLabel.toLowerCase()}, high cost</p>
        </div>
        <div className="rounded border border-blue-200 bg-blue-50/50 p-2 dark:border-blue-900/30 dark:bg-blue-900/10">
          <strong className="text-blue-700 dark:text-blue-400">Budget</strong>
          <p className="mt-0.5">Low {metricLabel.toLowerCase()}, low cost</p>
        </div>
        <div className="rounded border border-red-200 bg-red-50/50 p-2 dark:border-red-900/30 dark:bg-red-900/10">
          <strong className="text-red-700 dark:text-red-400">Avoid</strong>
          <p className="mt-0.5">Low {metricLabel.toLowerCase()}, high cost</p>
        </div>
      </div>
    </div>
  );
}
