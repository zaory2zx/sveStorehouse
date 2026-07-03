import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { CraftIcon } from '../components/CraftIcon';
import { emptyFilters, FilterBar, FilterValues } from '../components/FilterBar';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
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
import {
  buildCardCountFilters,
  buildCardSearchFilters,
  CARD_SEARCH_PAGE_SIZE,
} from '../lib/cardSearch';

interface AddCardPageProps {
  cardSets: string[];
  onAdded: () => void;
}

export function AddCardPage({ cardSets, onAdded }: AddCardPageProps) {
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CardRow | null>(null);
  const [variant, setVariant] = useState<CardVariant>('normal');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const queryFilters = useMemo(
    () => buildCardSearchFilters(filters, page),
    [filters, page],
  );

  const countFilters = useMemo(() => buildCardCountFilters(filters), [filters]);

  const handleFiltersChange = (next: FilterValues) => {
    setFilters(next);
    setPage(1);
  };

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        window.sveApi.searchCards(queryFilters),
        window.sveApi.countSearchCards(countFilters),
      ]);
      setCards(data);
      setTotal(count);
    } finally {
      setLoading(false);
    }
  }, [queryFilters, countFilters]);

  useEffect(() => {
    const timer = setTimeout(search, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    listRef.current?.scrollTo({ top: 0 });
  };

  const openAdd = (card: CardRow) => {
    setSelected(card);
    setVariant('normal');
    setQuantity(1);
    setError('');
    setSuccess('');
  };

  const confirmAdd = async (target: 'inventory' | 'forSale') => {
    if (!selected) return;
    setError('');
    try {
      if (target === 'inventory') {
        await window.sveApi.addInventory(selected.card_id, variant, quantity);
        setSuccess(`已添加到库存 ${displayName(selected)} ×${quantity}`);
      } else {
        await window.sveApi.addToForSale(selected.card_id, variant, quantity);
        setSuccess(`已添加到待售 ${displayName(selected)} ×${quantity}`);
      }
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
        <h2 className="text-2xl font-bold text-sve-text">添加卡牌</h2>
        <p className="mt-1 text-sm text-sve-muted">
          搜索支持中文/英文/日文名、卡号与效果文本
        </p>
      </header>

      <FilterBar values={filters} onChange={handleFiltersChange} cardSets={cardSets} />

      <div ref={listRef} className="min-h-0 flex-1 overflow-auto">
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

      <Pagination
        page={page}
        pageSize={CARD_SEARCH_PAGE_SIZE}
        total={total}
        onChange={handlePageChange}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="添加到库存"
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
              <button
                type="button"
                className="btn-secondary"
                onClick={() => confirmAdd('forSale')}
              >
                添加到待售
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => confirmAdd('inventory')}
              >
                添加到库存
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
