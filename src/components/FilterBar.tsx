import { Search, X } from 'lucide-react';
import {
  CardVariant,
  CLASS_LABELS,
  displayRare,
  KIND_LABELS,
  rareOptionValue,
  VARIANT_LABELS,
} from '../lib/constants';

export interface FilterValues {
  query: string;
  cardSet: string;
  classType: string;
  kind: string;
  variant: string;
  rare: string;
  cost: string;
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
  '',
  'Neutral',
  'Forestcraft',
  'Swordcraft',
  'Runecraft',
  'Dragoncraft',
  'Abysscraft',
  'Havencraft',
];

const KIND_OPTIONS = [
  '',
  'Leader',
  'Follower',
  'FollowerEvolved',
  'Spell',
  'Amulet',
  'Token',
];

export function FilterBar({
  values,
  onChange,
  cardSets,
  cardRares = [],
  showVariant = false,
  showRare = false,
  placeholder = '搜索中文/英文/日文名、卡号、效果…',
}: FilterBarProps) {
  const set = (key: keyof FilterValues, value: string) =>
    onChange({ ...values, [key]: value });

  const hasFilters = Object.values(values).some((v) => v !== '');

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
        <select
          className="select-field"
          value={values.cardSet}
          onChange={(e) => set('cardSet', e.target.value)}
        >
          <option value="">全部系列</option>
          {cardSets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="select-field"
          value={values.classType}
          onChange={(e) => set('classType', e.target.value)}
        >
          <option value="">全部职业</option>
          {CLASS_OPTIONS.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {CLASS_LABELS[c] ?? c}
            </option>
          ))}
        </select>

        <select
          className="select-field"
          value={values.kind}
          onChange={(e) => set('kind', e.target.value)}
        >
          <option value="">全部类型</option>
          {KIND_OPTIONS.filter(Boolean).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k] ?? k}
            </option>
          ))}
        </select>

        <select
          className="select-field w-24"
          value={values.cost}
          onChange={(e) => set('cost', e.target.value)}
        >
          <option value="">费用</option>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={String(i)}>
              {i}
            </option>
          ))}
          <option value="-1">X</option>
        </select>

        {showRare && (
          <select
            className="select-field"
            value={values.rare}
            onChange={(e) => set('rare', e.target.value)}
          >
            <option value="">全部稀有度</option>
            {cardRares.map((r) => (
              <option key={rareOptionValue(r)} value={rareOptionValue(r)}>
                {displayRare(r)}
              </option>
            ))}
          </select>
        )}

        {showVariant && (
          <select
            className="select-field"
            value={values.variant}
            onChange={(e) => set('variant', e.target.value)}
          >
            <option value="">全部版本</option>
            {(Object.keys(VARIANT_LABELS) as CardVariant[]).map((v) => (
              <option key={v} value={v}>
                {VARIANT_LABELS[v]}
              </option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            type="button"
            className="btn-secondary flex items-center gap-1"
            onClick={() =>
              onChange({
                query: '',
                cardSet: '',
                classType: '',
                kind: '',
                variant: '',
                rare: '',
                cost: '',
              })
            }
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
  cardSet: '',
  classType: '',
  kind: '',
  variant: '',
  rare: '',
  cost: '',
};
