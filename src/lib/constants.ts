export type CardVariant = 'normal' | 'premium' | 'alt_art' | 'pr';
export type CardLocale = 'en' | 'sc';
export type TradeType = 'buy' | 'sell' | 'exchange';
export type Page = 'inventory' | 'add' | 'cart' | 'addCart' | 'trades' | 'stats';

export interface CardRow {
  card_id: string;
  canonical_id: string;
  locale: CardLocale;
  card_set: string;
  card_number: string;
  kind: string;
  class: string;
  trait: string;
  name: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  img_url: string;
  cost: number;
  description: string;
  description_en: string;
  description_zh: string;
  description_ja: string;
  search_text: string;
  atk: number;
  def: number;
  limited_to_count: number;
  double_sided: number;
}

export interface InventoryRow {
  id: number;
  card_id: string;
  variant: CardVariant;
  quantity: number;
  name?: string;
  name_zh?: string;
  name_en?: string;
  locale?: CardLocale;
  class?: string;
  kind?: string;
  cost?: number;
  atk?: number;
  def?: number;
  img_url?: string;
  card_set?: string;
  description?: string;
  description_zh?: string;
}

export type CartRow = InventoryRow;

export interface TradeRow {
  id: number;
  trade_type: TradeType;
  card_id: string;
  variant: CardVariant;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  counterparty: string | null;
  traded_at: string;
  note: string | null;
  name?: string;
  name_zh?: string;
  img_url?: string;
}

export interface StatsSummary {
  totalCards: number;
  uniqueCards: number;
  byClass: { class: string; count: number }[];
  bySet: { card_set: string; count: number }[];
  byVariant: { variant: string; count: number }[];
}

export const VARIANT_LABELS: Record<CardVariant, string> = {
  normal: '普通',
  premium: '闪卡',
  alt_art: '异画',
  pr: 'PR',
};

export function displayCardId(card: {
  card_id?: string;
  canonical_id?: string;
}): string {
  if (card.canonical_id) return card.canonical_id;
  if (card.card_id) return card.card_id.replace(/(EN|SC)$/i, '');
  return '';
}

export const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy: '买入',
  sell: '卖出',
  exchange: '交换',
};

export const CLASS_LABELS: Record<string, string> = {
  Neutral: '中立',
  Forestcraft: '精灵',
  Swordcraft: '皇家',
  Runecraft: '巫师',
  Dragoncraft: '龙族',
  Shadowcraft: '梦魇',
  Abysscraft: '梦魇',
  Havencraft: '主教',
};

export const KIND_LABELS: Record<string, string> = {
  Leader: '领袖',
  Follower: '随从',
  FollowerEvolved: '进化随从',
  'Follower / Evolved': '进化随从',
  Spell: '法术',
  Amulet: '护符',
  Token: '衍生物',
};

export const CLASS_COLORS: Record<string, string> = {
  Neutral: '#8b93a7',
  Forestcraft: '#3d9e4f',
  Swordcraft: '#c9a227',
  Runecraft: '#4a7fd4',
  Dragoncraft: '#c44b3f',
  Shadowcraft: '#7b4aad',
  Abysscraft: '#7b4aad',
  Havencraft: '#d4b84a',
};

export function displayName(card: {
  name_zh?: string | null;
  name?: string | null;
  name_en?: string | null;
}): string {
  return card.name_zh?.trim() || card.name?.trim() || card.name_en?.trim() || '未知卡牌';
}

export function displayDescription(card: {
  description_zh?: string | null;
  description?: string | null;
  description_en?: string | null;
}): string {
  return (
    card.description_zh?.trim() ||
    card.description?.trim() ||
    card.description_en?.trim() ||
    ''
  );
}

export function subtitleName(card: {
  name_zh?: string | null;
  name?: string | null;
  name_en?: string | null;
}): string | null {
  const primary = displayName(card);
  const en = card.name_en?.trim();
  if (en && en !== primary) return en;
  const raw = card.name?.trim();
  if (raw && raw !== primary) return raw;
  return null;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `¥${amount.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
