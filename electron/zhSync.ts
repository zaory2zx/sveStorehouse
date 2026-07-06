import {
  buildSearchText,
  inferScImageUrl,
  mapCraft,
  mapKind,
  normalizeRare,
} from './cardUtils.js';
import { fetchWithRetry } from './fetchUtils.js';

const SVEHELPER_URL = 'https://www.svehelperwin.com/api/card/getCardList';
const PAGE_SIZE = 100;

export interface SveHelperCard {
  id: number;
  card_no: string;
  name_jp: string;
  name_cn: string;
  craft: string;
  card_type: string;
  type: string;
  rare: string;
  from: string;
  cost: number;
  attack: number;
  life: number;
  desc_jp: string;
  desc_cn: string;
  img_url?: string;
  has_back?: number;
}

export interface UnifiedCardRecord {
  card_id: string;
  canonical_id: string;
  locale: 'sc';
  card_set: string;
  card_number: string;
  kind: string;
  class: string;
  trait: string;
  name: string;
  name_en: string;
  name_zh: string;
  name_ja: string;
  description: string;
  description_en: string;
  description_zh: string;
  description_ja: string;
  search_text: string;
  rare: string;
  img_url: string;
  cost: number;
  atk: number;
  def: number;
  limited_to_count: number;
  double_sided: number;
}

export async function fetchAllSveHelperCards(): Promise<SveHelperCard[]> {
  const all: SveHelperCard[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const response = await fetchWithRetry(SVEHELPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        pageable: { limit: PAGE_SIZE, offset },
      }),
    });

    if (!response.ok) {
      throw new Error(`SVE-helper 下载失败: ${response.status}`);
    }

    const body = (await response.json()) as {
      code: number;
      data?: { list: SveHelperCard[]; total: number };
      msg?: string;
    };

    if (body.code !== 200 || !body.data?.list) {
      throw new Error(`SVE-helper 响应异常: ${body.msg ?? 'unknown'}`);
    }

    total = body.data.total;
    all.push(...body.data.list);
    offset += body.data.list.length;

    if (body.data.list.length === 0) break;
  }

  return all;
}

export function sveHelperToUnifiedRecord(
  card: SveHelperCard,
  enNameByCanonical: Map<string, string>,
  enDescByCanonical: Map<string, string>,
): UnifiedCardRecord {
  const canonical = card.card_no.toUpperCase();
  const cardSet = card.from.toUpperCase();
  const nameEn = enNameByCanonical.get(canonical) ?? '';
  const descEn = enDescByCanonical.get(canonical) ?? '';

  const kind = mapKind(card.card_type);

  return {
    card_id: canonical,
    canonical_id: canonical,
    locale: 'sc',
    card_set: cardSet,
    card_number: canonical.split('-')[1] ?? '',
    kind,
    class: mapCraft(card.craft),
    trait: card.type ?? '',
    name: card.name_cn || card.name_jp,
    name_en: nameEn,
    name_zh: card.name_cn,
    name_ja: card.name_jp,
    description: card.desc_cn || card.desc_jp,
    description_en: descEn,
    description_zh: card.desc_cn,
    description_ja: card.desc_jp,
    search_text: buildSearchText([
      canonical,
      card.name_cn,
      card.name_jp,
      nameEn,
      card.desc_cn,
      card.desc_jp,
      descEn,
      card.type,
      cardSet,
      normalizeRare(card.rare, card.card_type, kind),
    ]),
    rare: normalizeRare(card.rare, card.card_type, kind),
    img_url: card.img_url || inferScImageUrl(card.card_no, card.from),
    cost: card.cost,
    atk: card.attack,
    def: card.life,
    limited_to_count: 3,
    double_sided: card.has_back ? 1 : 0,
  };
}
