export type CardLocale = 'en' | 'sc';

export function toCanonicalId(cardId: string): string {
  return cardId.replace(/(EN|SC)$/i, '');
}

export function displayCardId(card: {
  card_id?: string;
  canonical_id?: string;
}): string {
  if (card.canonical_id) return card.canonical_id;
  if (card.card_id) return toCanonicalId(card.card_id);
  return '';
}

export function buildSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const CRAFT_MAP: Record<string, string> = {
  Forest: 'Forestcraft',
  Forestcraft: 'Forestcraft',
  Sword: 'Swordcraft',
  Royal: 'Swordcraft',
  Swordcraft: 'Swordcraft',
  Rune: 'Runecraft',
  Witch: 'Runecraft',
  Runecraft: 'Runecraft',
  Dragon: 'Dragoncraft',
  Dragoncraft: 'Dragoncraft',
  Abyss: 'Abysscraft',
  Nightmare: 'Abysscraft',
  Shadow: 'Abysscraft',
  Shadowcraft: 'Abysscraft',
  Abysscraft: 'Abysscraft',
  Haven: 'Havencraft',
  Havencraft: 'Havencraft',
  Neutral: 'Neutral',
};

const TYPE_MAP: Record<string, string> = {
  Follower: 'Follower',
  Spell: 'Spell',
  Amulet: 'Amulet',
  Leader: 'Leader',
  FollowerToken: 'Token',
  SpellToken: 'Token',
  AmuletToken: 'Token',
};

export function mapCraft(craft: string): string {
  return CRAFT_MAP[craft] ?? craft;
}

export function mapKind(cardType: string): string {
  if (cardType.includes('Evolved') || cardType === 'FollowerEvolved') {
    return 'FollowerEvolved';
  }
  if (cardType === 'Other') return 'Token';
  return TYPE_MAP[cardType] ?? cardType;
}

/** SVE-helper 中 rare 为 '-' 或空时，按卡牌类型归一化 */
export function normalizeRare(
  rawRare: string | null | undefined,
  cardType: string,
  kind: string,
): string {
  const raw = rawRare ?? '';
  if (raw && raw !== '-') return raw;

  if (
    kind === 'Token' ||
    kind === 'Other' ||
    /Token$/i.test(cardType) ||
    cardType === 'Other'
  ) {
    return 'TK';
  }
  if (kind === 'Leader') return 'LD';
  return raw;
}

export function inferScImageUrl(cardNo: string, fromSet: string): string {
  let imgName = cardNo.toLowerCase();
  if (cardNo.startsWith('BP01') || cardNo.startsWith('BP02')) {
    imgName = imgName.replace('-', '_');
  }
  return `https://shadowverse-evolve.com/wordpress/wp-content/images/cardlist/${fromSet}/${imgName}.png`;
}
