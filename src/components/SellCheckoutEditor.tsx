import { CardImage } from './CardImage';
import { VARIANT_LABELS, formatMoney } from '../lib/constants';
import { OrderDraftLine, draftLineTotal, draftOrderTotal } from '../lib/tradeOrder';

interface SellCheckoutEditorProps {
  lines: OrderDraftLine[];
  onChange: (lines: OrderDraftLine[]) => void;
}

export function SellCheckoutEditor({
  lines,
  onChange,
}: SellCheckoutEditorProps) {
  const updatePrice = (key: string, unitPrice: string) => {
    onChange(
      lines.map((line) => (line.key === key ? { ...line, unitPrice } : line)),
    );
  };

  const orderTotal = draftOrderTotal(lines);

  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <div
          key={line.key}
          className="flex gap-3 rounded-lg border border-sve-border bg-sve-bg p-3"
        >
          <CardImage
            src={line.imgUrl}
            alt={line.cardName}
            className="h-16 w-11 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{line.cardName}</p>
            <p className="mt-0.5 text-xs text-sve-muted">
              {VARIANT_LABELS[line.variant]} · ×{line.quantity}
            </p>
            <div className="mt-2">
              <label className="mb-1 block text-xs text-sve-muted">单价 (¥)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={line.unitPrice}
                onChange={(e) => updatePrice(line.key, e.target.value)}
              />
              {draftLineTotal(line) !== null && (
                <p className="mt-1 text-xs text-sve-muted">
                  小计 {formatMoney(draftLineTotal(line))}
                </p>
              )}
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
