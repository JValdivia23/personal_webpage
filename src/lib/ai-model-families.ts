/** Conservative grouping: only an explicitly named effort suffix is removed. */
export interface FamilyModel {
  id: string;
  shortName: string;
  provider: string;
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
      modelFamilyInfo(a).effortOrder - modelFamilyInfo(b).effortOrder ||
      a.shortName.localeCompare(b.shortName, undefined, { numeric: true }) || a.id.localeCompare(b.id)
    );
  }
  return [...groups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.key.localeCompare(b.key)
  );
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
