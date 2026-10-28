// Run with: node --experimental-strip-types --test scripts/test-ai-model-costs.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { getBenchmarkCost, getCostDescription, getCostScope } from '../src/lib/ai-model-costs.ts';

const model = {
  blendedPrice: 2.94,
  costToRunIndex: 8909,
  costPerTask: 10.04,
  code2videoCostToRun: 351,
  code2videoCostPerTask: 3.08,
};

test('Code2Video costs are independent of Intelligence Index costs', () => {
  assert.equal(getBenchmarkCost(model, 'code2videoElo', 'task'), 3.08);
  assert.equal(getBenchmarkCost(model, 'code2videoElo', 'cost'), 351);
  assert.equal(getBenchmarkCost(model, 'intelligenceIndex', 'task'), 10.04);
  assert.equal(getBenchmarkCost(model, 'scienceIndex', 'cost'), 8909);
});

test('Code2Video missing costs never fall back to Intelligence Index', () => {
  const missing = { ...model, code2videoCostToRun: null, code2videoCostPerTask: undefined };
  assert.equal(getBenchmarkCost(missing, 'code2videoElo', 'cost'), null);
  assert.equal(getBenchmarkCost(missing, 'code2videoElo', 'task'), null);
  assert.equal(getBenchmarkCost(missing, 'code2videoElo', 'price'), 2.94);
});

test('real zero is preserved for the chart to handle explicitly', () => {
  assert.equal(getBenchmarkCost({ ...model, code2videoCostPerTask: 0 }, 'code2videoElo', 'task'), 0);
});

test('cost descriptions identify both the benchmark and estimator', () => {
  assert.equal(getCostScope('code2videoElo'), 'Code2Video-AA');
  assert.equal(getCostScope('codingIndex'), 'Intelligence Index v5.0');
  assert.match(getCostDescription('code2videoElo', 'task'), /Estimated.*Code2Video-AA/);
  assert.match(getCostDescription('intelligenceIndex', 'task'), /Evaluation-weighted average/);
  assert.match(getCostDescription('code2videoElo', 'cost'), /114.*Excludes judging and rendering/);
  assert.match(getCostDescription('code2videoElo', 'price'), /7:2:1/);
});
