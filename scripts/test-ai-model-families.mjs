import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adjacentPlottedPairs, groupModelFamilies, modelFamilyInfo } from '../src/lib/ai-model-families.ts';

const model = (id, shortName, provider = 'OpenAI') => ({ id, shortName, provider });

test('groups explicit effort variants in effort order and preserves fallback', () => {
  const variants = [
    model('max', 'GPT-6.1 Terra (max)'),
    model('high', 'GPT-6.1 Terra (high)'),
    model('none', 'GPT-6.1 Terra (non-reasoning)'),
    model('xhigh', 'GPT-6.1 Terra (xhigh)'),
    model('low', 'GPT-6.1 Terra (low)'),
    model('medium', 'GPT-6.1 Terra (medium)'),
  ];
  const [family] = groupModelFamilies(variants);
  assert.equal(family.name, 'GPT-6.1 Terra');
  assert.deepEqual(family.models.map(m => m.id), ['none', 'low', 'medium', 'high', 'xhigh', 'max']);
  assert.equal(modelFamilyInfo(model('a', 'Claude Opus 5.5 (max with fallback)')).effort, 'max with fallback');
});

test('does not merge different providers, generations, releases, or variants without explicit effort', () => {
  const variants = [
    model('terra', 'GPT-6.1 Terra (max)'),
    model('sol', 'GPT-6.1 Sol (max)'),
    model('other', 'GPT-6.1 Terra (high)', 'Other'),
    model('vision', 'DeepSeek V4 Flash Vision (max)', 'DeepSeek'),
    model('dated', 'DeepSeek V4 Flash 0731 (max)', 'DeepSeek'),
    model('unknown1', 'Example'), model('unknown2', 'Example'),
  ];
  assert.equal(groupModelFamilies(variants).length, variants.length);
});

test('missing points break lines, while hidden efforts can be omitted from the selection', () => {
  assert.deepEqual(adjacentPlottedPairs(['low', undefined, 'high', 'max']), [['high', 'max']]);
  assert.deepEqual(adjacentPlottedPairs(['low', 'high']), [['low', 'high']]);
  assert.deepEqual(adjacentPlottedPairs([undefined, 'high']), []);
});

test('current dataset keeps Terra, Sol, Gemini and fallback variants separate and complete', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/ai-models.json', import.meta.url)));
  const families = groupModelFamilies(data.models);
  assert.equal(families.reduce((n, family) => n + family.models.length, 0), data.models.length);
  const find = (name) => families.find(f => f.name === name);
  assert.equal(find('GPT-6.1 Terra').models.length, 6);
  assert.equal(find('GPT-6.1 Sol').models.length, 5);
  assert.deepEqual(find('Gemini 3.8 Flash').models.map(m => modelFamilyInfo(m).effort), ['low', 'medium', 'high']);
  assert.ok(find('Claude Opus 5.5').models.every(m => modelFamilyInfo(m).effort.includes('fallback')));
});
