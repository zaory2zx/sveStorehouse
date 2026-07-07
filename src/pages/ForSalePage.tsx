import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { CraftIcon } from '../components/CraftIcon';
import { emptyFilters, FilterBar, FilterValues } from '../components/FilterBar';
import { ExportImageButton } from '../components/ExportImageButton';
import { Modal } from '../components/Modal';
import { QuantityControl } from '../components/QuantityControl';
import { SellCheckoutEditor } from '../components/SellCheckoutEditor';
import { CardTitle } from '../components/CardTitle';
import {
  CLASS_LABELS,
  ForSaleRow,
  KIND_LABELS,
  displayName,
  displayRare,
  rareFilterToQuery,
} from '../lib/constants';
import { OrderDraftLine, draftToOrderItems } from '../lib/tradeOrder';

interface ForSalePageProps {
  cardSets: string[];
  cardRares: string[];
  refreshKey: number;
  onChanged: () => void;
}

function lineKey(item: ForSaleRow) {
  return `${item.card_id}-${item.variant}`;
}

function clampQty(qty: number, max: number) {
  return Math.min(Math.max(1, qty), max);
}

export function ForSalePage({
  cardSets,
  cardRares,
  refreshKey,
  onChanged,
}: ForSalePageProps) {
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
  const [items, setItems] = useState<ForSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sellQty, setSellQty] = useState<Record<string, number>>({});
  const [showSell, setShowSell] = useState(false);
  const [checkoutLines, setCheckoutLines] = useState<OrderDraftLine[]>([]);
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
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
      const data = await window.sveApi.getForSale(queryFilters);
      setItems(data);
      setSelected((prev) => {
        const valid = new Set(data.map(lineKey));
        return new Set([...prev].filter((key) => valid.has(key)));
      });
      setSellQty((prev) => {
        const next: Record<string, number> = {};
        for (const item of data) {
          const key = lineKey(item);
          next[key] = clampQty(prev[key] ?? 1, item.quantity);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load, refreshKey]);

  const toggleSelect = (item: ForSaleRow) => {
    const key = lineKey(item);
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
      setSelected(new Set(items.map(lineKey)));
    }
  };

  const getExportItems = () => {
    if (selected.size > 0) {
      return items.filter((item) => selected.has(lineKey(item)));
    }
    return items;
  };

  const getSellQty = (item: ForSaleRow) =>
    clampQty(sellQty[lineKey(item)] ?? 1, item.quantity);

  const setSellQtyFor = (item: ForSaleRow, qty: number) => {
    const key = lineKey(item);
    setSellQty((prev) => ({ ...prev, [key]: clampQty(qty, item.quantity) }));
  };

  const buildCheckoutLines = (targets: ForSaleRow[]): OrderDraftLine[] =>
    targets.map((item) => ({
      key: lineKey(item),
      cardId: item.card_id,
      cardName: displayName(item),
      imgUrl: item.img_url,
      variant: item.variant,
      quantity: getSellQty(item),
      unitPrice: '',
      maxQuantity: item.quantity,
    }));

  const openCheckout = (targets: ForSaleRow[]) => {
    if (targets.length === 0) return;
    setCheckoutLines(buildCheckoutLines(targets));
    setCounterparty('');
    setNote('');
    setError('');
    setShowSell(true);
  };

  const openSell = (item: ForSaleRow) => {
    openCheckout([item]);
  };

  const openSellSelected = () => {
    const targets = items.filter((item) => selected.has(lineKey(item)));
    openCheckout(targets);
  };

  const confirmSell = async () => {
    if (checkoutLines.length === 0) return;
    setError('');
    try {
      await window.sveApi.sellFromForSale({
        items: draftToOrderItems(checkoutLines),
        counterparty: counterparty.trim() || null,
        note: note.trim() || null,
      });
      setShowSell(false);
      setSelected(new Set());
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '售出失败');
    }
  };

  const selectedCount = selected.size;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-sve-text">待售</h2>
          <p className="mt-1 text-sm text-sve-muted">
            共 {items.length} 条待售记录 · 调整数量后批量售出
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {selectedCount > 0 && (
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={openSellSelected}
            >
              批量售出 ({selectedCount})
            </button>
          )}
          <ExportImageButton
            title="待售清单"
            filenamePrefix="SVE待售"
            disabled={loading}
            loadItems={async () => getExportItems()}
          />
        </div>
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
          {selectedCount > 0 && (
            <span className="text-sm text-sve-muted">已选 {selectedCount} 项</span>
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
            <p>暂无待售卡牌</p>
            <p className="mt-1 text-xs">前往「我的库存」标记待售</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {items.map((item) => {
              const key = lineKey(item);
              const isSelected = selected.has(key);

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
                      <span className="badge shrink-0 bg-orange-900/30 text-orange-300">
                        待售 ×{item.quantity}
                      </span>
                    </div>

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

                    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-3">
                      <QuantityControl
                        size="sm"
                        value={getSellQty(item)}
                        onChange={(qty) => setSellQtyFor(item, qty)}
                        max={item.quantity}
                      />
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        onClick={() => openSell(item)}
                      >
                        售出
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showSell}
        onClose={() => setShowSell(false)}
        title={checkoutLines.length > 1 ? '批量售出' : '售出卡牌'}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <SellCheckoutEditor
            lines={checkoutLines}
            onChange={setCheckoutLines}
          />

          <div>
            <label className="mb-2 block text-sm text-sve-muted">购买人</label>
            <input
              className="input-field"
              placeholder="填写购买人"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-sve-muted">备注</label>
            <input
              className="input-field"
              placeholder="可选"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowSell(false)}
            >
              取消
            </button>
            <button type="button" className="btn-primary" onClick={confirmSell}>
              确认售出
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
