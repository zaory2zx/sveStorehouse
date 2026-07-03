import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { CraftIcon } from '../components/CraftIcon';
import { emptyFilters, FilterBar, FilterValues } from '../components/FilterBar';
import { Modal } from '../components/Modal';
import { QuantityControl } from '../components/QuantityControl';
import { CardTitle } from '../components/CardTitle';
import {
  CardRow,
  CardVariant,
  CLASS_LABELS,
  KIND_LABELS,
  VARIANT_LABELS,
  displayCardId,
  displayDescription,
  displayName,
} from '../lib/constants';

interface AddToCartPageProps {
  cardSets: string[];
  onAdded: () => void;
}

export function AddToCartPage({ cardSets, onAdded }: AddToCartPageProps) {
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CardRow | null>(null);
  const [variant, setVariant] = useState<CardVariant>('normal');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryFilters = useMemo(
    () => ({
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
      limit: 80,
    }),
    [filters],
  );

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.sveApi.searchCards(queryFilters);
      setCards(data);
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    const timer = setTimeout(search, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = (card: CardRow) => {
    setSelected(card);
    setVariant('normal');
    setQuantity(1);
    setError('');
    setSuccess('');
  };

  const confirmAdd = async () => {
    if (!selected) return;
    setError('');
    try {
      await window.sveApi.addCart(selected.card_id, variant, quantity);
      setSuccess(`已加入购物车 ${displayName(selected)} ×${quantity}`);
      onAdded();
      setTimeout(() => {
        setSelected(null);
        setSuccess('');
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header>
        <h2 className="text-2xl font-bold text-sve-text">加入购物车</h2>
        <p className="mt-1 text-sm text-sve-muted">
          搜索卡牌并加入购入清单，支持多语言搜索
        </p>
      </header>

      <FilterBar values={filters} onChange={setFilters} cardSets={cardSets} />

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sve-muted">
            搜索中…
          </div>
        ) : cards.length === 0 ? (
          <div className="panel flex h-40 items-center justify-center text-sve-muted">
            未找到匹配的卡牌，试试调整筛选条件
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {cards.map((card) => (
              <button
                key={card.card_id}
                type="button"
                onClick={() => openAdd(card)}
                className="panel group overflow-hidden p-2 text-left transition hover:border-sve-gold/30 hover:shadow-glow"
              >
                <CardImage
                  src={card.img_url}
                  alt={card.name}
                  className="mb-2 aspect-[5/7] w-full"
                />
                <div className="flex items-center gap-1.5">
                  <CraftIcon className={card.class} size={16} />
                  <span className="truncate text-sm font-medium">
                    {displayName(card)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-sve-muted">
                  {displayCardId(card)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="加入购物车"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <CardImage
                src={selected.img_url}
                alt={displayName(selected)}
                className="h-36 w-24 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <CardTitle card={selected} className="text-lg" />
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  <span className="badge bg-sve-card text-sve-muted">
                    {CLASS_LABELS[selected.class] ?? selected.class}
                  </span>
                  <span className="badge bg-sve-card text-sve-muted">
                    {KIND_LABELS[selected.kind] ?? selected.kind}
                  </span>
                  {selected.cost >= 0 && (
                    <span className="badge bg-sve-card text-sve-muted">
                      费用 {selected.cost}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-sve-muted">
                  {displayDescription(selected)}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-sve-muted">版本</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(VARIANT_LABELS) as CardVariant[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariant(v)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      variant === v
                        ? 'border-sve-gold bg-sve-gold/15 text-sve-gold'
                        : 'border-sve-border bg-sve-card text-sve-muted hover:text-sve-text'
                    }`}
                  >
                    {VARIANT_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-sve-muted">数量</label>
              <QuantityControl value={quantity} onChange={setQuantity} />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelected(null)}
              >
                取消
              </button>
              <button type="button" className="btn-primary" onClick={confirmAdd}>
                确认加入
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
