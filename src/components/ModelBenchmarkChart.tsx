'use client';

import { useMemo } from 'react';
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
  intelligenceIndex: number;
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
  labelPos: number;
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
  'xAI': '#ef4444',
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
  pos: number;
  lineLen: number;
}

function placeLabels(allPoints: ChartPoint[]): LabelPlacement[] {
  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const directions = [
    [0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7],
    [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7],
  ];

  const norm = (v: number, min: number, range: number) => ((v - min) / range) * 100;
  const norms = allPoints.map((p) => ({ x: norm(p.x, xMin, xRange), y: norm(p.y, yMin, yRange) }));

  // Approximate chart pixel size → normalized unit conversion
  // Chart area is roughly 600–700 px wide; 100 normalized units ≈ 650 px
  const PX_PER_UNIT = 6.5;
  const DOT_RADIUS = 5 / PX_PER_UNIT; // 5 px dot radius in normalized units

  const placed: Array<[number, number, number, number]> = [];
  const results: LabelPlacement[] = new Array(allPoints.length);

  for (let pi = 0; pi < allPoints.length; pi++) {
    const p = allPoints[pi];
    const px = norms[pi].x;
    const py = norms[pi].y;
    const label = p.shortName || p.name;

    // Text box in normalized units (10 px font ≈ 5.5 px per char)
    const textWidth = label.length * 0.85;
    const textHeight = 2.2;

    // Find nearest neighbour to know which direction to avoid
    let nearestDist = Infinity;
    let nearestDx = 0;
    let nearestDy = 0;
    for (let j = 0; j < norms.length; j++) {
      if (j === pi) continue;
      const dx = norms[j].x - px;
      const dy = norms[j].y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist && d > 0) {
        nearestDist = d;
        nearestDx = dx / d;
        nearestDy = dy / d;
      }
    }

    // Score directions: higher = pointing away from nearest dot = better
    const dirScores = directions.map(([dx, dy], dIdx) => {
      const dotAvoid = -(dx * nearestDx + dy * nearestDy);
      return { dIdx, dx, dy, score: dotAvoid };
    });
    dirScores.sort((a, b) => b.score - a.score);

    let best: [number, number] = [4, 6]; // default down, 6 px
    let bestScore = Infinity;

    // Try each direction, starting with very short lines
    for (const { dIdx, dx, dy } of dirScores) {
      for (const lineLenPx of [6, 10, 14, 18, 24, 32, 42]) {
        const lineLen = lineLenPx / PX_PER_UNIT;
        const lx = px + dx * lineLen;
        const ly = py + dy * lineLen;
        const hw = textWidth / 2;
        const hh = textHeight / 2;
        const box: [number, number, number, number] = [
          lx - hw, ly - hh, lx + hw, ly + hh,
        ];

        let score = 0;

        // Check if label overlaps with ANY dot
        for (let j = 0; j < norms.length; j++) {
          const dotX = norms[j].x;
          const dotY = norms[j].y;
          const closestX = Math.max(box[0], Math.min(dotX, box[2]));
          const closestY = Math.max(box[1], Math.min(dotY, box[3]));
          const dist = Math.sqrt((dotX - closestX) ** 2 + (dotY - closestY) ** 2);

          if (dist < DOT_RADIUS) {
            score += 5000; // directly on top of a dot
          } else if (dist < DOT_RADIUS * 2.5) {
            score += 200;  // uncomfortably close to a dot
          }
        }

        // Check overlap with already-placed labels
        for (const placedBox of placed) {
          const ox = Math.max(0, Math.min(box[2], placedBox[2]) - Math.max(box[0], placedBox[0]));
          const oy = Math.max(0, Math.min(box[3], placedBox[3]) - Math.max(box[1], placedBox[1]));
          if (ox > 0 && oy > 0) {
            score += ox * oy * 100;
          }
        }

        // Strong preference for short lines (closer to dot)
        score += lineLenPx * 0.25;

        if (score < bestScore) {
          bestScore = score;
          best = [dIdx, lineLenPx];
        }
      }
    }

    const [dIdx, lineLen] = best;
    const [dx, dy] = directions[dIdx];
    const lx = px + dx * (lineLen / PX_PER_UNIT);
    const ly = py + dy * (lineLen / PX_PER_UNIT);
    const hw = textWidth / 2;
    const hh = textHeight / 2;
    placed.push([lx - hw, ly - hh, lx + hw, ly + hh]);
    results[pi] = { pos: dIdx, lineLen };
  }

  return results;
}

// ---------------------------------------------------------------------------
// Custom Scatter Shape with leader line + label (8-direction support)
// ---------------------------------------------------------------------------
function CustomScatterShape(props: any) {
  const { cx, cy, fill, stroke, payload, onClick } = props;
  if (cx == null || cy == null) return null;

  const label = payload.shortName || payload.name;
  const labelPos = payload.labelPos ?? 0;
  const lineLen = payload.lineLen ?? 24;
  const textOffset = 5;

  const dirs = [
    [0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7],
    [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7],
  ];
  const [dx, dy] = dirs[labelPos % 8];

  const lx = cx + dx * lineLen;
  const ly = cy + dy * lineLen;

  let tx: number, ty: number, textAnchor: 'middle' | 'start' | 'end', dominantBaseline: 'auto' | 'middle' | 'hanging';

  switch (labelPos % 8) {
    case 0:
      tx = lx; ty = ly - textOffset;
      textAnchor = 'middle'; dominantBaseline = 'auto';
      break;
    case 1:
      tx = lx + textOffset; ty = ly - textOffset;
      textAnchor = 'start'; dominantBaseline = 'auto';
      break;
    case 2:
      tx = lx + textOffset; ty = ly;
      textAnchor = 'start'; dominantBaseline = 'middle';
      break;
    case 3:
      tx = lx + textOffset; ty = ly + textOffset;
      textAnchor = 'start'; dominantBaseline = 'hanging';
      break;
    case 4:
      tx = lx; ty = ly + textOffset + 8;
      textAnchor = 'middle'; dominantBaseline = 'hanging';
      break;
    case 5:
      tx = lx - textOffset; ty = ly + textOffset;
      textAnchor = 'end'; dominantBaseline = 'hanging';
      break;
    case 6:
      tx = lx - textOffset; ty = ly;
      textAnchor = 'end'; dominantBaseline = 'middle';
      break;
    default:
      tx = lx - textOffset; ty = ly - textOffset;
      textAnchor = 'end'; dominantBaseline = 'auto';
      break;
  }

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <line
        x1={cx}
        y1={cy}
        x2={lx}
        y2={ly}
        stroke={fill}
        strokeWidth={1.5}
        strokeDasharray="3 2"
        opacity={0.5}
      />
      <circle cx={cx} cy={cy} r={5} fill={fill} stroke="none" />
      <text
        x={tx}
        y={ty}
        textAnchor={textAnchor}
        dominantBaseline={dominantBaseline}
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
      <text
        x={tx}
        y={ty}
        textAnchor={textAnchor}
        dominantBaseline={dominantBaseline}
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
  // Prepare chart data: X = cost/price, Y = selected metric
  const chartData = useMemo<ChartPoint[]>(() => {
    const raw = models
      .filter((m) => {
        // Exclude models with null selected metric
        const metricVal = (m as any)[selectedMetric];
        if (metricVal == null || typeof metricVal !== 'number') return false;

        // Exclude $0 price models in price mode
        if (priceMode === 'price') {
          if (m.blendedPrice == null || m.blendedPrice === 0) return false;
        }
        // Exclude $0 cost models in cost mode
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
        labelPos: 0,
      }));

    // Sort by Y descending so higher scores get placed first (less overlap)
    raw.sort((a, b) => b.y - a.y);
    return raw;
  }, [models, selectedMetric, priceMode]);

  // Compute axis domains
  const xDomain = useMemo<[number, number]>(() => {
    const vals = chartData.map((d) => d.x);
    if (vals.length === 0) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  const yDomain = useMemo<[number, number]>(() => {
    const vals = chartData.map((d) => d.y);
    if (vals.length === 0) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.12;
    const lo = Math.max(0, Math.round((min - pad) * 10) / 10);
    const hi = Math.round((max + pad) * 10) / 10;
    return [lo, hi];
  }, [chartData]);

  // Compute 75th percentile for price/cost axis (accounts for right-skewed distribution)
  const thresholdX = useMemo(() => {
    const sorted = [...chartData].sort((a, b) => a.x - b.x);
    const idx = Math.floor(sorted.length * 0.75);
    return sorted[Math.min(idx, sorted.length - 1)].x;
  }, [chartData]);

  const medianY = useMemo(() => {
    const sorted = [...chartData].sort((a, b) => a.y - b.y);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1].y + sorted[mid].y) / 2
      : sorted[mid].y;
  }, [chartData]);

  // Assign collision-aware label placements
  const chartDataWithLabels = useMemo<ChartPoint[]>(() => {
    const placements = placeLabels(chartData);
    return chartData.map((m, i) => ({
      ...m,
      labelPos: placements[i].pos,
      lineLen: placements[i].lineLen,
    }));
  }, [chartData]);

  const xAxisLabel = priceMode === 'price'
    ? 'Blended Price ($ / 1M tokens) →'
    : 'Cost to Run Index ($) →';

  const chartTitle = `Cost vs. ${metricLabel}`;

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
                value: `${metricLabel} ↑`,
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {Array.from(new Set(models.map((m) => m.provider))).map((provider) => (
          <div key={provider} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getProviderColor(provider) }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {provider}
            </span>
          </div>
        ))}
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
