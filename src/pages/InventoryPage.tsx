import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { CraftIcon } from '../components/CraftIcon';
import { emptyFilters, FilterBar, FilterValues } from '../components/FilterBar';
import { Modal } from '../components/Modal';
import { QuantityControl } from '../components/QuantityControl';
import { CardTitle } from '../components/CardTitle';
import {
  CLASS_LABELS,
  InventoryRow,
  KIND_LABELS,
  VARIANT_LABELS,
  displayName,
} from '../lib/constants';

interface InventoryPageProps {
  cardSets: string[];
  refreshKey: number;
  onChanged: () => void;
}

export function InventoryPage({
  cardSets,
  refreshKey,
  onChanged,
}: InventoryPageProps) {
  const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add');
  const [error, setError] = useState('');

  const queryFilters = useMemo(
    () => ({
      query: filters.query || undefined,
      cardSet: filters.cardSet || undefined,
      classType: filters.classType || undefined,
      kind: filters.kind || undefined,
      variant: filters.variant || undefined,
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

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header>
        <h2 className="text-2xl font-bold text-sve-text">我的库存</h2>
        <p className="mt-1 text-sm text-sve-muted">
          共 {items.length} 条记录 · 支持多语言搜索
        </p>
      </header>

      <FilterBar
        values={filters}
        onChange={setFilters}
        cardSets={cardSets}
        showVariant
      />

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
            {items.map((item) => (
              <div
                key={`${item.card_id}-${item.variant}`}
                className="panel flex gap-4 p-4 transition hover:border-sve-gold/20"
              >
                <CardImage
                  src={item.img_url}
                  alt={item.name ?? item.card_id}
                  className="h-28 w-20 shrink-0"
                />
                <div className="min-w-0 flex-1">
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

                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="badge bg-sve-card text-sve-muted">
                      {VARIANT_LABELS[item.variant]}
                    </span>
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

                  <div className="mt-3 flex gap-2">
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
                </div>
              </div>
            ))}
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
                  {VARIANT_LABELS[adjustTarget.variant]} · 当前{' '}
                  {adjustTarget.quantity} 张
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
