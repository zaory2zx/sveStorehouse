import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { Modal } from '../components/Modal';
import { QuantityControl } from '../components/QuantityControl';
import {
  CardRow,
  CardVariant,
  formatDate,
  formatMoney,
  TRADE_TYPE_LABELS,
  TradeRow,
  TradeType,
  VARIANT_LABELS,
  displayName,
  displayCardId,
} from '../lib/constants';

interface TradesPageProps {
  refreshKey: number;
  onChanged: () => void;
}

export function TradesPage({ refreshKey, onChanged }: TradesPageProps) {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CardRow[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardRow | null>(null);

  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [variant, setVariant] = useState<CardVariant>('normal');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [tradedAt, setTradedAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.sveApi.getTrades(200);
      setTrades(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await window.sveApi.searchCards({
        query: searchQuery,
        limit: 10,
      });
      setSearchResults(data);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetForm = () => {
    setSelectedCard(null);
    setSearchQuery('');
    setTradeType('buy');
    setVariant('normal');
    setQuantity(1);
    setUnitPrice('');
    setCounterparty('');
    setTradedAt(new Date().toISOString().slice(0, 16));
    setNote('');
    setError('');
  };

  const submitTrade = async () => {
    if (!selectedCard) {
      setError('请选择一张卡牌');
      return;
    }
    setError('');
    try {
      const price = unitPrice ? parseFloat(unitPrice) : null;
      await window.sveApi.createTrade({
        tradeType,
        cardId: selectedCard.card_id,
        variant,
        quantity,
        unitPrice: price,
        counterparty: counterparty || null,
        tradedAt: new Date(tradedAt).toISOString(),
        note: note || null,
        adjustInventory: tradeType !== 'exchange',
      });
      setShowForm(false);
      resetForm();
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleDelete = async (trade: TradeRow) => {
    let revertInventory = false;
    if (trade.trade_type !== 'exchange') {
      revertInventory = confirm(
        '删除此记录并撤销库存变动？\n（买入记录删除后将减少库存，卖出记录删除后将增加库存）',
      );
      if (!revertInventory && !confirm('仅删除记录，不调整库存？')) return;
    } else if (!confirm('确认删除此交易记录？')) {
      return;
    }

    try {
      await window.sveApi.deleteTrade(trade.id, revertInventory);
      onChanged();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  };

  const totalPreview =
    unitPrice && quantity
      ? (parseFloat(unitPrice) * quantity).toFixed(2)
      : null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-sve-text">交易记录</h2>
          <p className="mt-1 text-sm text-sve-muted">
            记录买入/卖出/交换，自动更新库存（交换不自动调整）
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          新建交易
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sve-muted">
            加载中…
          </div>
        ) : trades.length === 0 ? (
          <div className="panel flex h-40 flex-col items-center justify-center text-sve-muted">
            <p>暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="panel flex items-center gap-4 p-4 transition hover:border-sve-gold/15"
              >
                <CardImage
                  src={trade.img_url}
                  alt={trade.name ?? ''}
                  className="h-16 w-11 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`badge ${
                        trade.trade_type === 'buy'
                          ? 'bg-green-900/40 text-green-300'
                          : trade.trade_type === 'sell'
                            ? 'bg-red-900/40 text-red-300'
                            : 'bg-blue-900/40 text-blue-300'
                      }`}
                    >
                      {TRADE_TYPE_LABELS[trade.trade_type]}
                    </span>
                    <span className="font-medium">{displayName(trade)}</span>
                    <span className="text-sm text-sve-muted">
                      ×{trade.quantity} · {VARIANT_LABELS[trade.variant]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-sve-muted">
                    {formatDate(trade.traded_at)}
                    {trade.counterparty && ` · ${trade.counterparty}`}
                    {trade.note && ` · ${trade.note}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sve-gold">
                    {formatMoney(trade.total_amount)}
                  </p>
                  {trade.unit_price !== null && (
                    <p className="text-xs text-sve-muted">
                      单价 {formatMoney(trade.unit_price)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleDelete(trade)}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="新建交易"
        width="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-sve-muted">交易类型</label>
            <div className="flex gap-2">
              {(['buy', 'sell', 'exchange'] as TradeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTradeType(t)}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    tradeType === t
                      ? 'border-sve-gold bg-sve-gold/15 text-sve-gold'
                      : 'border-sve-border bg-sve-card text-sve-muted'
                  }`}
                >
                  {TRADE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-sve-muted">搜索卡牌</label>
            <input
              className="input-field"
              placeholder="输入卡名或卡号…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCard(null);
              }}
            />
            {searchResults.length > 0 && !selectedCard && (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-sve-border bg-sve-bg">
                {searchResults.map((card) => (
                  <button
                    key={card.card_id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sve-card"
                    onClick={() => {
                      setSelectedCard(card);
                      setSearchQuery(displayName(card));
                      setSearchResults([]);
                    }}
                  >
                    <span className="font-medium">{displayName(card)}</span>
                    <span className="text-sve-muted">
                      {displayCardId(card)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedCard && (
              <p className="mt-2 text-sm text-green-400">
                已选：{displayName(selectedCard)} ({displayCardId(selectedCard)})
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-sve-muted">版本</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(VARIANT_LABELS) as CardVariant[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    variant === v
                      ? 'border-sve-gold bg-sve-gold/15 text-sve-gold'
                      : 'border-sve-border bg-sve-card text-sve-muted'
                  }`}
                >
                  {VARIANT_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-sve-muted">数量</label>
              <QuantityControl value={quantity} onChange={setQuantity} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-sve-muted">
                单价 (¥)
              </label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
              {totalPreview && (
                <p className="mt-1 text-xs text-sve-muted">
                  合计 ¥{totalPreview}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-sve-muted">
                交易对象
              </label>
              <input
                className="input-field"
                placeholder="可选"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-sve-muted">日期</label>
              <input
                className="input-field"
                type="datetime-local"
                value={tradedAt}
                onChange={(e) => setTradedAt(e.target.value)}
              />
            </div>
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
              onClick={() => setShowForm(false)}
            >
              取消
            </button>
            <button type="button" className="btn-primary" onClick={submitTrade}>
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
