import { X } from 'lucide-react';
import { CardImage } from './CardImage';
import { QuantityControl } from './QuantityControl';
import { CardVariant, VARIANT_LABELS, formatMoney } from '../lib/constants';
import { OrderDraftLine, draftLineTotal, draftOrderTotal } from '../lib/tradeOrder';

interface OrderDraftEditorProps {
  lines: OrderDraftLine[];
  onChange: (lines: OrderDraftLine[]) => void;
  showVariantPicker?: boolean;
}

export function OrderDraftEditor({
  lines,
  onChange,
  showVariantPicker = true,
}: OrderDraftEditorProps) {
  const updateLine = (key: string, patch: Partial<OrderDraftLine>) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => {
    onChange(lines.filter((line) => line.key !== key));
  };

  const orderTotal = draftOrderTotal(lines);

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sve-border px-4 py-8 text-center text-sm text-sve-muted">
        尚未添加卡牌
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <div
          key={line.key}
          className="rounded-lg border border-sve-border bg-sve-bg p-3"
        >
          <div className="flex gap-3">
            <CardImage
              src={line.imgUrl}
              alt={line.cardName}
              className="h-16 w-11 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium">{line.cardName}</p>
                <button
                  type="button"
                  className="text-sve-muted hover:text-red-400"
                  onClick={() => removeLine(line.key)}
                  title="移除"
                >
                  <X size={16} />
                </button>
              </div>

              {showVariantPicker && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Object.keys(VARIANT_LABELS) as CardVariant[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateLine(line.key, { variant: v })}
                      className={`rounded border px-2 py-0.5 text-xs ${
                        line.variant === v
                          ? 'border-sve-gold bg-sve-gold/15 text-sve-gold'
                          : 'border-sve-border text-sve-muted'
                      }`}
                    >
                      {VARIANT_LABELS[v]}
                    </button>
                  ))}
                </div>
              )}

              {!showVariantPicker && (
                <p className="mt-1 text-xs text-sve-muted">
                  {VARIANT_LABELS[line.variant]}
                </p>
              )}

              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-sve-muted">数量</label>
                  <QuantityControl
                    value={line.quantity}
                    onChange={(quantity) => updateLine(line.key, { quantity })}
                    max={line.maxQuantity ?? 99}
                    size="sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-sve-muted">单价 (¥)</label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(line.key, { unitPrice: e.target.value })
                    }
                  />
                  {draftLineTotal(line) !== null && (
                    <p className="mt-1 text-xs text-sve-muted">
                      小计 {formatMoney(draftLineTotal(line))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {orderTotal !== null && (
        <p className="text-right text-sm text-sve-muted">
          订单合计{' '}
          <span className="font-semibold text-sve-gold">
            {formatMoney(orderTotal)}
          </span>
        </p>
      )}
    </div>
  );
}
