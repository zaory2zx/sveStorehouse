import { Search, X } from 'lucide-react';
import {
  CardVariant,
  CLASS_LABELS,
  displayRare,
  KIND_LABELS,
  rareOptionValue,
  VARIANT_LABELS,
} from '../lib/constants';
import { MultiSelectFilter } from './MultiSelectFilter';

export interface FilterValues {
  query: string;
  cardSet: string[];
  classType: string[];
  kind: string[];
  variant: string[];
  rare: string[];
  cost: string[];
}

interface FilterBarProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  cardSets: string[];
  cardRares?: string[];
  showVariant?: boolean;
  showRare?: boolean;
  placeholder?: string;
}

const CLASS_OPTIONS = [
  'Neutral',
  'Forestcraft',
  'Swordcraft',
  'Runecraft',
  'Dragoncraft',
  'Abysscraft',
  'Havencraft',
];

const KIND_OPTIONS = [
  'Leader',
  'Follower',
  'FollowerEvolved',
  'Spell',
  'Amulet',
  'Token',
];

const COST_OPTIONS = [
  ...Array.from({ length: 11 }, (_, i) => ({
    value: String(i),
    label: String(i),
  })),
  { value: '-1', label: 'X' },
];

function hasActiveFilters(values: FilterValues): boolean {
  if (values.query.trim()) return true;
  return (
    values.cardSet.length > 0 ||
    values.classType.length > 0 ||
    values.kind.length > 0 ||
    values.variant.length > 0 ||
    values.rare.length > 0 ||
    values.cost.length > 0
  );
}

export function FilterBar({
  values,
  onChange,
  cardSets,
  cardRares = [],
  showVariant = false,
  showRare = false,
  placeholder = '搜索中文/英文/日文名、卡号、效果…',
}: FilterBarProps) {
  const set = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) =>
    onChange({ ...values, [key]: value });

  const hasFilters = hasActiveFilters(values);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sve-muted"
        />
        <input
          className="input-field pl-10"
          placeholder={placeholder}
          value={values.query}
          onChange={(e) => set('query', e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <MultiSelectFilter
          placeholder="全部系列"
          options={cardSets.map((s) => ({ value: s, label: s }))}
          values={values.cardSet}
          onChange={(v) => set('cardSet', v)}
          maxListHeight="20rem"
        />

        <MultiSelectFilter
          placeholder="全部职业"
          options={CLASS_OPTIONS.map((c) => ({
            value: c,
            label: CLASS_LABELS[c] ?? c,
          }))}
          values={values.classType}
          onChange={(v) => set('classType', v)}
        />

        <MultiSelectFilter
          placeholder="全部类型"
          options={KIND_OPTIONS.map((k) => ({
            value: k,
            label: KIND_LABELS[k] ?? k,
          }))}
          values={values.kind}
          onChange={(v) => set('kind', v)}
        />

        <MultiSelectFilter
          placeholder="费用"
          options={COST_OPTIONS}
          values={values.cost}
          onChange={(v) => set('cost', v)}
          className="w-24"
        />

        {showRare && (
          <MultiSelectFilter
            placeholder="全部稀有度"
            options={cardRares.map((r) => ({
              value: rareOptionValue(r),
              label: displayRare(r),
            }))}
            values={values.rare}
            onChange={(v) => set('rare', v)}
          />
        )}

        {showVariant && (
          <MultiSelectFilter
            placeholder="全部版本"
            options={(Object.keys(VARIANT_LABELS) as CardVariant[]).map((v) => ({
              value: v,
              label: VARIANT_LABELS[v],
            }))}
            values={values.variant}
            onChange={(v) => set('variant', v)}
          />
        )}

        {hasFilters && (
          <button
            type="button"
            className="btn-secondary flex items-center gap-1"
            onClick={() => onChange({ ...emptyFilters })}
          >
            <X size={14} />
            清除
          </button>
        )}
      </div>
    </div>
  );
}

export const emptyFilters: FilterValues = {
  query: '',
  cardSet: [],
  classType: [],
  kind: [],
  variant: [],
  rare: [],
  cost: [],
};
