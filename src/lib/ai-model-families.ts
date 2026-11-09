/** Conservative grouping: only an explicitly named effort suffix is removed. */
export interface FamilyModel {
  id: string;
  shortName: string;
  provider: string;
  intelligenceIndex: number | null;
}

export interface ModelFamily<T extends FamilyModel> {
  key: string;
  name: string;
  provider: string;
  models: T[];
}

const EFFORT_SUFFIX = /^(.*?)\s+\((non-reasoning|low|medium|high|xhigh|max)( with fallback)?\)$/i;
const EFFORT_ORDER: Record<string, number> = {
  'non-reasoning': 0, low: 1, medium: 2, high: 3, xhigh: 4, max: 5,
};

export function modelFamilyInfo(model: FamilyModel) {
  const match = model.shortName.match(EFFORT_SUFFIX);
  const name = match ? match[1] : model.shortName;
  return {
    // Models without an explicit effort are deliberately not merged based on
    // a shared prefix: e.g. Vision and dated releases can be distinct models.
    key: match ? JSON.stringify([model.provider, name]) : JSON.stringify([model.provider, model.id]),
    name,
    effort: match ? `${match[2].toLowerCase()}${match[3] || ''}` : null,
    effortOrder: match ? EFFORT_ORDER[match[2].toLowerCase()] : -1,
  };
}

function score(model: FamilyModel): number {
  return typeof model.intelligenceIndex === 'number' && Number.isFinite(model.intelligenceIndex)
    ? model.intelligenceIndex : -Infinity;
}

function compareScores(a: number, b: number): number {
  return a === b ? 0 : a > b ? -1 : 1;
}

/** Chart connections follow effort, independent of the selector's score order. */
export function sortModelsByEffort<T extends FamilyModel>(models: T[]): T[] {
  return [...models].sort((a, b) =>
    modelFamilyInfo(a).effortOrder - modelFamilyInfo(b).effortOrder ||
    a.shortName.localeCompare(b.shortName, undefined, { numeric: true }) || a.id.localeCompare(b.id)
  );
}

/** Families are ranked by their highest-scoring tracked variant, including hidden ones. */
export function groupModelFamilies<T extends FamilyModel>(models: T[]): ModelFamily<T>[] {
  const groups = new Map<string, ModelFamily<T>>();
  for (const model of models) {
    const info = modelFamilyInfo(model);
    if (!groups.has(info.key)) {
      groups.set(info.key, { key: info.key, name: info.name, provider: model.provider, models: [] });
    }
    groups.get(info.key)!.models.push(model);
  }
  for (const family of groups.values()) {
    family.models.sort((a, b) =>
      compareScores(score(a), score(b)) ||
      modelFamilyInfo(b).effortOrder - modelFamilyInfo(a).effortOrder ||
      a.shortName.localeCompare(b.shortName, undefined, { numeric: true }) || a.id.localeCompare(b.id)
    );
  }
  return [...groups.values()].sort((a, b) =>
    compareScores(score(a.models[0]), score(b.models[0])) ||
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.key.localeCompare(b.key)
  );
}

/** Bulk-enabling a family shows every variant except non-reasoning ones,
 *  which stay hidden unless toggled individually. A family consisting only
 *  of non-reasoning variants still enables (avoids a dead control). */
export function familyEnableTargets<T extends FamilyModel>(models: T[]): T[] {
  const reasoning = models.filter((m) => modelFamilyInfo(m).effort !== 'non-reasoning');
  return reasoning.length > 0 ? reasoning : [...models];
}

/** Expand selected families for the chart only, keeping the saved selection intact. */
export function expandSelectedModelFamilies<T extends FamilyModel>(allModels: T[], selectedModels: T[]): T[] {
  const selectedIds = new Set(selectedModels.map((model) => model.id));
  const selectedFamilies = new Set(selectedModels.map((model) => modelFamilyInfo(model).key));
  return allModels.filter((model) => selectedIds.has(model.id) || (
    selectedFamilies.has(modelFamilyInfo(model).key) &&
    modelFamilyInfo(model).effort !== 'non-reasoning'
  ));
}

/** Join only adjacent selected efforts with data; missing entries break a line. */
export function adjacentPlottedPairs<T>(points: Array<T | undefined>): Array<[T, T]> {
  const pairs: Array<[T, T]> = [];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    if (previous !== undefined && current !== undefined) pairs.push([previous, current]);
  }
  return pairs;
}
