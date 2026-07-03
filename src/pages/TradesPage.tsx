import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CardImage } from '../components/CardImage';
import { Modal } from '../components/Modal';
import { OrderDraftEditor } from '../components/OrderDraftEditor';
import {
  CardRow,
  TradeOrderRow,
  TradeType,
  TRADE_TYPE_LABELS,
  VARIANT_LABELS,
  displayCardId,
  displayName,
  formatDate,
  formatMoney,
} from '../lib/constants';
import { OrderDraftLine, draftToOrderItems } from '../lib/tradeOrder';

interface TradesPageProps {
  refreshKey: number;
  onChanged: () => void;
}

export function TradesPage({ refreshKey, onChanged }: TradesPageProps) {
  const [orders, setOrders] = useState<TradeOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CardRow[]>([]);
  const [draftLines, setDraftLines] = useState<OrderDraftLine[]>([]);
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [counterparty, setCounterparty] = useState('');
  const [tradedAt, setTradedAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.sveApi.getOrders(200);
      setOrders(data);
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
    setSearchQuery('');
    setSearchResults([]);
    setDraftLines([]);
    setTradeType('buy');
    setCounterparty('');
    setTradedAt(new Date().toISOString().slice(0, 16));
    setNote('');
    setError('');
  };

  const addCardToDraft = (card: CardRow) => {
    const key = `${card.card_id}-normal`;
    if (draftLines.some((line) => line.key === key)) {
      setError('该卡牌已在清单中');
      return;
    }
    setDraftLines([
      ...draftLines,
      {
        key,
        cardId: card.card_id,
        cardName: displayName(card),
        imgUrl: card.img_url,
        variant: 'normal',
        quantity: 1,
        unitPrice: '',
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  const submitOrder = async () => {
    if (draftLines.length === 0) {
      setError('请至少添加一张卡牌');
      return;
    }
    setError('');
    try {
      await window.sveApi.createOrder({
        tradeType,
        items: draftToOrderItems(draftLines),
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

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (order: TradeOrderRow) => {
    let revertInventory = false;
    if (order.trade_type !== 'exchange') {
      revertInventory = confirm(
        '删除此订单并撤销库存变动？\n（买入订单删除后将减少库存，卖出订单删除后将增加库存）',
      );
      if (!revertInventory && !confirm('仅删除订单，不调整库存？')) return;
    } else if (!confirm('确认删除此订单？')) {
      return;
    }

    try {
      await window.sveApi.deleteOrder(order.id, revertInventory);
      onChanged();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  };

  const itemSummary = (order: TradeOrderRow) => {
    if (order.items.length === 1) {
      const item = order.items[0];
      return `${displayName(item)} ×${item.quantity} · ${VARIANT_LABELS[item.variant]}`;
    }
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    return `${order.items.length} 种卡牌 · 共 ${totalQty} 张`;
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-sve-text">交易记录</h2>
          <p className="mt-1 text-sm text-sve-muted">
            支持一单多种卡牌，自动更新库存（交换不自动调整）
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
          新建订单
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sve-muted">
            加载中…
          </div>
        ) : orders.length === 0 ? (
          <div className="panel flex h-40 flex-col items-center justify-center text-sve-muted">
            <p>暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const isOpen = expanded.has(order.id);
              const firstItem = order.items[0];
              return (
                <div
                  key={order.id}
                  className="panel overflow-hidden transition hover:border-sve-gold/15"
                >
                  <div className="flex items-center gap-4 p-4">
                    <button
                      type="button"
                      className="shrink-0 text-sve-muted hover:text-sve-text"
                      onClick={() => toggleExpand(order.id)}
                    >
                      {isOpen ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    {firstItem && (
                      <CardImage
                        src={firstItem.img_url}
                        alt={displayName(firstItem)}
                        className="h-16 w-11 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`badge ${
                            order.trade_type === 'buy'
                              ? 'bg-green-900/40 text-green-300'
                              : order.trade_type === 'sell'
                                ? 'bg-red-900/40 text-red-300'
                                : 'bg-blue-900/40 text-blue-300'
                          }`}
                        >
                          {TRADE_TYPE_LABELS[order.trade_type]}
                        </span>
                        <span className="font-medium">订单 #{order.id}</span>
                        <span className="text-sm text-sve-muted">
                          {itemSummary(order)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-sve-muted">
                        {formatDate(order.traded_at)}
                        {order.counterparty && ` · ${order.counterparty}`}
                        {order.note && ` · ${order.note}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sve-gold">
                        {formatMoney(order.total_amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleDelete(order)}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-sve-border bg-sve-bg/40 px-4 py-3">
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-lg border border-sve-border/60 px-3 py-2"
                          >
                            <CardImage
                              src={item.img_url}
                              alt={displayName(item)}
                              className="h-12 w-8 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {displayName(item)}
                              </p>
                              <p className="text-xs text-sve-muted">
                                ×{item.quantity} · {VARIANT_LABELS[item.variant]}
                                {item.unit_price !== null &&
                                  ` · 单价 ${formatMoney(item.unit_price)}`}
                              </p>
                            </div>
                            <p className="text-sm text-sve-gold">
                              {formatMoney(item.line_total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="新建订单"
        width="max-w-2xl"
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
            <label className="mb-2 block text-sm text-sve-muted">搜索并添加卡牌</label>
            <input
              className="input-field"
              placeholder="输入卡名或卡号…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-sve-border bg-sve-bg">
                {searchResults.map((card) => (
                  <button
                    key={card.card_id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sve-card"
                    onClick={() => addCardToDraft(card)}
                  >
                    <span className="font-medium">{displayName(card)}</span>
                    <span className="text-sve-muted">
                      {displayCardId(card)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <OrderDraftEditor lines={draftLines} onChange={setDraftLines} />

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
            <button type="button" className="btn-primary" onClick={submitOrder}>
              保存订单
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
