import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adjacentPlottedPairs, familyEnableTargets, groupModelFamilies, modelFamilyInfo, sortModelsByEffort } from '../src/lib/ai-model-families.ts';

const model = (id, shortName, provider = 'OpenAI', intelligenceIndex = null) => ({ id, shortName, provider, intelligenceIndex });

test('groups variants by intelligence while chart lines retain effort order', () => {
  const variants = [
    model('max', 'GPT-6.1 Terra (max)', 'OpenAI', 50),
    model('high', 'GPT-6.1 Terra (high)', 'OpenAI', 42),
    model('none', 'GPT-6.1 Terra (non-reasoning)', 'OpenAI', 30),
    model('xhigh', 'GPT-6.1 Terra (xhigh)', 'OpenAI', 45),
    model('low', 'GPT-6.1 Terra (low)', 'OpenAI', 29),
    model('medium', 'GPT-6.1 Terra (medium)', 'OpenAI', 38),
  ];
  const [family] = groupModelFamilies(variants);
  assert.equal(family.name, 'GPT-6.1 Terra');
  assert.deepEqual(family.models.map(m => m.id), ['max', 'xhigh', 'high', 'medium', 'none', 'low']);
  assert.deepEqual(sortModelsByEffort(family.models).map(m => m.id), ['none', 'low', 'medium', 'high', 'xhigh', 'max']);
  assert.equal(modelFamilyInfo(model('a', 'Claude Opus 5.5 (max with fallback)')).effort, 'max with fallback');
});

test('families and variants sort by highest actual score, with unscored entries last', () => {
  const families = groupModelFamilies([
    model('alpha-max', 'Alpha (max)', 'OpenAI', null),
    model('alpha-low', 'Alpha (low)', 'OpenAI', 40),
    model('beta', 'Beta (max)', 'OpenAI', 50),
    model('gamma', 'Gamma (max)', 'OpenAI', null),
    model('zero', 'Zero (max)', 'OpenAI', 0),
  ]);
  assert.deepEqual(families.map(f => f.name), ['Beta', 'Alpha', 'Zero', 'Gamma']);
  assert.deepEqual(families[1].models.map(m => m.id), ['alpha-low', 'alpha-max']);
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

test('bulk-enabling a family skips non-reasoning variants unless the family is only non-reasoning', () => {
  const family = [
    model('max', 'GPT-6.1 Terra (max)', 'OpenAI', 50),
    model('low', 'GPT-6.1 Terra (low)', 'OpenAI', 29),
    model('none', 'GPT-6.1 Terra (non-reasoning)', 'OpenAI', 30),
  ];
  assert.deepEqual(familyEnableTargets(family).map(m => m.id), ['max', 'low']);
  const onlyNonReasoning = [model('none', 'Example (non-reasoning)', 'OpenAI', 10)];
  assert.deepEqual(familyEnableTargets(onlyNonReasoning).map(m => m.id), ['none']);
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
  assert.deepEqual(sortModelsByEffort(find('Gemini 3.8 Flash').models).map(m => modelFamilyInfo(m).effort), ['low', 'medium', 'high']);
  assert.ok(find('Claude Opus 5.5').models.every(m => modelFamilyInfo(m).effort.includes('fallback')));
});
