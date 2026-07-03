import { FilterValues } from '../components/FilterBar';

export const CARD_SEARCH_PAGE_SIZE = 60;

export function buildCardSearchFilters(
  filters: FilterValues,
  page: number,
): {
  query?: string;
  cardSet?: string;
  classType?: string;
  kind?: string;
  cost?: number | null;
  limit: number;
  offset: number;
} {
  return {
    query: filters.query || undefined,
    cardSet: filters.cardSet || undefined,
    classType: filters.classType || undefined,
    kind: filters.kind || undefined,
    cost:
      filters.cost === ''
        ? undefined
        : filters.cost === '-1'
          ? -1
          : Number(filters.cost),
    limit: CARD_SEARCH_PAGE_SIZE,
    offset: (page - 1) * CARD_SEARCH_PAGE_SIZE,
  };
}

export function buildCardCountFilters(filters: FilterValues): {
  query?: string;
  cardSet?: string;
  classType?: string;
  kind?: string;
  cost?: number | null;
} {
  return {
    query: filters.query || undefined,
    cardSet: filters.cardSet || undefined,
    classType: filters.classType || undefined,
    kind: filters.kind || undefined,
    cost:
      filters.cost === ''
        ? undefined
        : filters.cost === '-1'
          ? -1
          : Number(filters.cost),
  };
}
