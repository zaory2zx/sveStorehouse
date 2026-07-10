import { FilterValues } from '../components/FilterBar';
import { rareFiltersToQuery } from './constants';

function pickMany(values: string[]): string[] | undefined {
  return values.length > 0 ? values : undefined;
}

function costFiltersToQuery(
  values: string[],
): number | number[] | undefined {
  if (values.length === 0) return undefined;
  const nums = values.map((v) => (v === '-1' ? -1 : Number(v)));
  return nums.length === 1 ? nums[0] : nums;
}

export function buildListQueryFilters(filters: FilterValues) {
  return {
    query: filters.query || undefined,
    cardSet: pickMany(filters.cardSet),
    classType: pickMany(filters.classType),
    kind: pickMany(filters.kind),
    variant: pickMany(filters.variant),
    rare: rareFiltersToQuery(filters.rare),
    cost: costFiltersToQuery(filters.cost),
  };
}

export const CARD_SEARCH_PAGE_SIZE = 60;

export function buildCardSearchFilters(filters: FilterValues, page: number) {
  return {
    ...buildListQueryFilters(filters),
    limit: CARD_SEARCH_PAGE_SIZE,
    offset: (page - 1) * CARD_SEARCH_PAGE_SIZE,
  };
}

export function buildCardCountFilters(filters: FilterValues) {
  return buildListQueryFilters(filters);
}
