import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { CraftIcon } from '../components/CraftIcon';
import { emptyFilters, FilterBar, FilterValues } from '../components/FilterBar';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { QuantityControl } from '../components/QuantityControl';
import { CardTitle } from '../components/CardTitle';
import {
  CardQuantities,
  CardRow,
  CLASS_LABELS,
  KIND_LABELS,
  displayCardId,
  displayDescription,
  displayName,
  displayRare,
} from '../lib/constants';
import {
  buildCardCountFilters,
  buildCardSearchFilters,
  CARD_SEARCH_PAGE_SIZE,
} from '../lib/cardSearch';

interface AddCardPageProps {
  cardSets: string[];
  cardRares: string[];
  onAdded: () => void;
}

export function AddCardPage({ cardSets, cardRares, onAdded }: AddCardPageProps) {
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CardRow | null>(null);
  const [quantities, setQuantities] = useState<CardQuantities | null>(null);
  const [quantitiesLoading, setQuantitiesLoading] = useState(false);
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

  const loadQuantities = useCallback(async (cardId: string) => {
    setQuantitiesLoading(true);
    try {
      const data = await window.sveApi.getCardQuantities(cardId);
      setQuantities(data);
    } catch {
      setQuantities(null);
    } finally {
      setQuantitiesLoading(false);
    }
  }, []);

  const openAdd = (card: CardRow) => {
    setSelected(card);
    setQuantity(1);
    setQuantities(null);
    setError('');
    setSuccess('');
    void loadQuantities(card.card_id);
  };

  const confirmAdd = async (target: 'inventory' | 'forSale' | 'cart') => {
    if (!selected) return;
    setError('');
    try {
      if (target === 'inventory') {
        await window.sveApi.addInventory(selected.card_id, 'normal', quantity);
        setSuccess(`已添加到库存 ${displayName(selected)} ×${quantity}`);
      } else if (target === 'forSale') {
        await window.sveApi.addToForSale(selected.card_id, 'normal', quantity);
        setSuccess(`已添加到待售 ${displayName(selected)} ×${quantity}`);
      } else {
        await window.sveApi.addCart(selected.card_id, 'normal', quantity);
        setSuccess(`已加入购物车 ${displayName(selected)} ×${quantity}`);
      }
      onAdded();
      await loadQuantities(selected.card_id);
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
          搜索卡牌后可添加到库存、待售或购物车
        </p>
      </header>

      <FilterBar
        values={filters}
        onChange={handleFiltersChange}
        cardSets={cardSets}
        cardRares={cardRares}
        showRare
      />

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
                  {card.rare ? ` · ${displayRare(card.rare)}` : ''}
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
        title="添加卡牌"
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
                  {selected.rare && (
                    <span className="badge bg-sve-card text-sve-muted">
                      {displayRare(selected.rare)}
                    </span>
                  )}
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

            <div className="rounded-lg border border-sve-border/60 bg-sve-card/40 p-3">
              <p className="mb-2 text-xs text-sve-muted">当前持有（含全部异画/闪卡）</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-sve-muted">库存</p>
                  <p className="mt-0.5 text-lg font-semibold text-sve-text">
                    {quantitiesLoading ? '…' : (quantities?.inventory ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-orange-300/80">待售</p>
                  <p className="mt-0.5 text-lg font-semibold text-orange-300">
                    {quantitiesLoading ? '…' : (quantities?.forSale ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-300/80">购物车</p>
                  <p className="mt-0.5 text-lg font-semibold text-blue-300">
                    {quantitiesLoading ? '…' : (quantities?.cart ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-sve-muted">添加数量</label>
              <QuantityControl value={quantity} onChange={setQuantity} />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelected(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="rounded-lg border border-orange-800/60 bg-orange-950/50 px-4 py-2 text-sm font-medium text-orange-300 transition hover:border-orange-700/70 hover:bg-orange-900/45"
                onClick={() => confirmAdd('forSale')}
              >
                添加到待售
              </button>
              <button
                type="button"
                className="rounded-lg border border-blue-800/60 bg-blue-950/50 px-4 py-2 text-sm font-medium text-blue-300 transition hover:border-blue-700/70 hover:bg-blue-900/45"
                onClick={() => confirmAdd('cart')}
              >
                加入购物车
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
