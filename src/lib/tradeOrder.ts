import { CardVariant } from './constants';

export interface OrderDraftLine {
  key: string;
  cardId: string;
  cardName: string;
  imgUrl?: string;
  variant: CardVariant;
  quantity: number;
  unitPrice: string;
  maxQuantity?: number;
}

export function draftLineTotal(line: OrderDraftLine): number | null {
  if (!line.unitPrice) return null;
  const price = parseFloat(line.unitPrice);
  if (Number.isNaN(price)) return null;
  return price * line.quantity;
}

export function draftOrderTotal(lines: OrderDraftLine[]): number | null {
  let sum = 0;
  let hasPrice = false;
  for (const line of lines) {
    const total = draftLineTotal(line);
    if (total !== null) {
      sum += total;
      hasPrice = true;
    }
  }
  return hasPrice ? sum : null;
}

export function draftToOrderItems(lines: OrderDraftLine[]) {
  return lines.map((line) => ({
    cardId: line.cardId,
    variant: line.variant,
    quantity: line.quantity,
    unitPrice: line.unitPrice ? parseFloat(line.unitPrice) : null,
  }));
}
