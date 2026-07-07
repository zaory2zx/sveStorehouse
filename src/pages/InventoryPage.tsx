import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { CraftIcon } from '../components/CraftIcon';
import { emptyFilters, FilterBar, FilterValues } from '../components/FilterBar';
import { Modal } from '../components/Modal';
import { QuantityControl } from '../components/QuantityControl';
import { CardTitle } from '../components/CardTitle';
import { ExportImageButton } from '../components/ExportImageButton';
import {
  CLASS_LABELS,
  InventoryRow,
  KIND_LABELS,
  displayName,
  displayRare,
  rareFilterToQuery,
} from '../lib/constants';

interface InventoryPageProps {
  cardSets: string[];
  cardRares: string[];
  refreshKey: number;
  onChanged: () => void;
}

function itemKey(item: InventoryRow) {
  return `${item.card_id}-${item.variant}`;
}

function clampQty(qty: number, max: number) {
  if (max <= 0) return 1;
  return Math.min(Math.max(1, qty), max);
}

export function InventoryPage({
  cardSets,
  cardRares,
  refreshKey,
  onChanged,
}: InventoryPageProps) {
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add');
  const [actionQty, setActionQty] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const queryFilters = useMemo(
    () => ({
      query: filters.query || undefined,
      cardSet: filters.cardSet || undefined,
      classType: filters.classType || undefined,
      kind: filters.kind || undefined,
      rare: rareFilterToQuery(filters.rare),
      cost:
        filters.cost === ''
          ? undefined
          : filters.cost === '-1'
            ? -1
            : Number(filters.cost),
    }),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.sveApi.getInventory(queryFilters);
      setItems(data);
      setSelected((prev) => {
        const valid = new Set(data.map(itemKey));
        return new Set([...prev].filter((key) => valid.has(key)));
      });
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load, refreshKey]);

  const openAdjust = (item: InventoryRow, mode: 'add' | 'remove') => {
    setAdjustTarget(item);
    setAdjustMode(mode);
    setAdjustQty(1);
    setError('');
  };

  const confirmAdjust = async () => {
    if (!adjustTarget) return;
    setError('');
    try {
      if (adjustMode === 'add') {
        await window.sveApi.addInventory(
          adjustTarget.card_id,
          adjustTarget.variant,
          adjustQty,
        );
      } else {
        await window.sveApi.removeInventory(
          adjustTarget.card_id,
          adjustTarget.variant,
          adjustQty,
        );
      }
      setAdjustTarget(null);
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const availableForSale = (item: InventoryRow) =>
    item.quantity - (item.for_sale_quantity ?? 0);

  const getActionQty = (item: InventoryRow, max: number) =>
    clampQty(actionQty[itemKey(item)] ?? 1, max);

  const setActionQtyFor = (item: InventoryRow, max: number, qty: number) => {
    const key = itemKey(item);
    setActionQty((prev) => ({ ...prev, [key]: clampQty(qty, max) }));
  };

  const handleMarkForSale = async (item: InventoryRow) => {
    const max = availableForSale(item);
    const qty = getActionQty(item, max);
    try {
      await window.sveApi.markForSale(item.card_id, item.variant, qty);
      onChanged();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    }
  };

  const toggleSelect = (item: InventoryRow) => {
    const key = itemKey(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(itemKey)));
    }
  };

  const getExportItems = () => {
    if (selected.size > 0) {
      return items.filter((item) => selected.has(itemKey(item)));
    }
    return items;
  };

  const handleUnmarkForSale = async (item: InventoryRow) => {
    const max = item.for_sale_quantity ?? 0;
    const qty = getActionQty(item, max);
    try {
      await window.sveApi.unmarkForSale(item.card_id, item.variant, qty);
      onChanged();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-sve-text">我的库存</h2>
          <p className="mt-1 text-sm text-sve-muted">
            共 {items.length} 条记录 · 调整数量后可直接标记/取消待售
          </p>
        </div>
        <ExportImageButton
          title="我的库存"
          filenamePrefix="SVE库存"
          disabled={loading}
          loadItems={async () => getExportItems()}
        />
      </header>

      <FilterBar
        values={filters}
        onChange={setFilters}
        cardSets={cardSets}
        cardRares={cardRares}
        showRare
      />

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={toggleSelectAll}
          >
            {selected.size === items.length ? '取消全选' : '全选'}
          </button>
          {selected.size > 0 && (
            <span className="text-sm text-sve-muted">已选 {selected.size} 项</span>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sve-muted">
            加载中…
          </div>
        ) : items.length === 0 ? (
          <div className="panel flex h-40 flex-col items-center justify-center text-sve-muted">
            <p>暂无库存</p>
            <p className="mt-1 text-xs">前往「添加卡牌」开始录入</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {items.map((item) => {
              const key = itemKey(item);
              const isSelected = selected.has(key);
              const markMax = availableForSale(item);
              const unmarkMax = item.for_sale_quantity ?? 0;
              const actionMax = Math.max(markMax, unmarkMax);

              return (
                <div
                  key={key}
                  className={`panel flex gap-4 p-4 transition ${
                    isSelected
                      ? 'border-sve-gold/40 shadow-glow'
                      : 'hover:border-sve-gold/20'
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-2 accent-sve-gold"
                      checked={isSelected}
                      onChange={() => toggleSelect(item)}
                    />
                    <CardImage
                      src={item.img_url}
                      alt={item.name ?? item.card_id}
                      className="h-28 w-20 shrink-0"
                    />
                  </label>
                  <div className="flex min-h-28 min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CraftIcon className={item.class ?? 'Neutral'} />
                          <CardTitle
                            card={item}
                            className="truncate font-semibold"
                          />
                        </div>
                      </div>
                      <span className="badge shrink-0 bg-sve-gold/15 text-sve-gold">
                        ×{item.quantity}
                      </span>
                    </div>

                    {unmarkMax > 0 && (
                      <p className="mt-1 text-xs text-orange-300">
                        待售 {unmarkMax} 张
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {item.rare && (
                        <span className="badge bg-sve-card text-sve-muted">
                          {displayRare(item.rare)}
                        </span>
                      )}
                      <span className="badge bg-sve-card text-sve-muted">
                        {CLASS_LABELS[item.class ?? ''] ?? item.class}
                      </span>
                      <span className="badge bg-sve-card text-sve-muted">
                        {KIND_LABELS[item.kind ?? ''] ?? item.kind}
                      </span>
                      {item.cost !== undefined && item.cost >= 0 && (
                        <span className="badge bg-sve-card text-sve-muted">
                          费用 {item.cost}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary text-xs"
                          onClick={() => openAdjust(item, 'add')}
                        >
                          增加
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          onClick={() => openAdjust(item, 'remove')}
                        >
                          减少
                        </button>
                      </div>

                      {(markMax > 0 || unmarkMax > 0) && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <QuantityControl
                            size="sm"
                            value={getActionQty(item, actionMax)}
                            onChange={(qty) =>
                              setActionQtyFor(item, actionMax, qty)
                            }
                            max={actionMax}
                          />
                          {markMax > 0 && (
                            <button
                              type="button"
                              className="rounded-lg border border-orange-800/60 bg-orange-950/50 px-3 py-1.5 text-xs font-medium text-orange-300 transition hover:border-orange-700/70 hover:bg-orange-900/45"
                              onClick={() => handleMarkForSale(item)}
                            >
                              标记待售
                            </button>
                          )}
                          {unmarkMax > 0 && (
                            <button
                              type="button"
                              className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500/60 hover:bg-slate-700/45"
                              onClick={() => handleUnmarkForSale(item)}
                            >
                              取消待售
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={adjustMode === 'add' ? '增加库存' : '减少库存'}
      >
        {adjustTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CardImage
                src={adjustTarget.img_url}
                alt={displayName(adjustTarget)}
                className="h-24 w-16"
              />
              <div>
                <CardTitle card={adjustTarget} />
                <p className="text-sm text-sve-muted">
                  {displayRare(adjustTarget.rare)} · 当前 {adjustTarget.quantity} 张
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-sve-muted">数量</label>
              <QuantityControl
                value={adjustQty}
                onChange={setAdjustQty}
                max={adjustMode === 'remove' ? adjustTarget.quantity : 99}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAdjustTarget(null)}
              >
                取消
              </button>
              <button type="button" className="btn-primary" onClick={confirmAdjust}>
                确认
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
