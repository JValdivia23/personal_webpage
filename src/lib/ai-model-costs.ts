export type PriceMode = 'price' | 'cost' | 'task';

interface BenchmarkCosts {
  blendedPrice: number | null;
  costToRunIndex: number | null;
  costPerTask: number | null;
  code2videoCostToRun?: number | null;
  code2videoCostPerTask?: number | null;
}

/** Code2Video never inherits Intelligence Index costs, even when its own are absent. */
export function getBenchmarkCost(model: BenchmarkCosts, metric: string, mode: PriceMode): number | null {
  if (mode === 'price') return model.blendedPrice;
  if (metric === 'code2videoElo') {
    return (mode === 'task' ? model.code2videoCostPerTask : model.code2videoCostToRun) ?? null;
  }
  return mode === 'task' ? model.costPerTask : model.costToRunIndex;
}

export function getCostScope(metric: string): string {
  return metric === 'code2videoElo' ? 'Code2Video-AA' : 'Intelligence Index v5.0';
}

export function getCostDescription(metric: string, mode: PriceMode): string {
  if (mode === 'price') {
    return 'Blended price assuming a 7:2:1 ratio of cache hits, input, and output tokens.';
  }
  if (metric === 'code2videoElo') {
    return mode === 'task'
      ? 'Estimated contestant API cost per Code2Video-AA task (log scale), from AA token counts and API prices. Excludes judging and rendering.'
      : 'Estimated contestant API cost for all 114 Code2Video-AA briefs. Excludes judging and rendering.';
  }
  return mode === 'task'
    ? 'Evaluation-weighted average API cost per Intelligence Index v5.0 task (log scale), not the cost of the selected individual metric.'
    : 'Total API cost to run Intelligence Index v5.0, not the cost of the selected individual metric.';
}
