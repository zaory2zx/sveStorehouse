import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SVEHELPER_URL = 'https://www.svehelperwin.com/api/card/getCardList';

async function fetchPage(offset) {
  const response = await fetch(SVEHELPER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SVE-Inventory/0.2',
    },
    body: JSON.stringify({ name: '', pageable: { limit: 500, offset } }),
  });
  return response.json();
}

async function fetchAll() {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const body = await fetchPage(offset);
    if (body.code !== 200 || !body.data?.list) {
      throw new Error(`API error: ${JSON.stringify(body)}`);
    }
    total = body.data.total;
    all.push(...body.data.list);
    console.log('page offset', offset, 'got', body.data.list.length, 'total', total);
    offset += body.data.list.length;
    if (body.data.list.length === 0) break;
  }
  return all;
}

function toScId(cardNo) {
  return `${cardNo.toUpperCase()}SC`;
}

const cards = await fetchAll();
console.log('fetched', cards.length);

const bad = cards.filter((c) => !c.card_no || !c.from);
console.log('bad records', bad.length, bad.slice(0, 3));

const tmp = path.join(os.tmpdir(), 'sve-sc-test.db');
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
const db = new Database(tmp);
db.exec(`
  CREATE TABLE cards (
    card_id TEXT PRIMARY KEY,
    canonical_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    card_set TEXT NOT NULL,
    card_number TEXT,
    kind TEXT NOT NULL,
    class TEXT NOT NULL,
    trait TEXT,
    name TEXT NOT NULL,
    name_en TEXT,
    name_zh TEXT,
    name_ja TEXT,
    img_url TEXT,
    cost INTEGER,
    description TEXT,
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    search_text TEXT,
    atk INTEGER,
    def INTEGER,
    limited_to_count INTEGER DEFAULT 3,
    double_sided INTEGER DEFAULT 0
  );
`);

const insert = db.prepare(`
  INSERT INTO cards (
    card_id, canonical_id, locale, card_set, card_number, kind, class, trait,
    name, name_en, name_zh, name_ja, img_url, cost, description,
    description_en, description_zh, description_ja, search_text,
    atk, def, limited_to_count, double_sided
  ) VALUES (
    @card_id, @canonical_id, @locale, @card_set, @card_number, @kind, @class, @trait,
    @name, @name_en, @name_zh, @name_ja, @img_url, @cost, @description,
    @description_en, @description_zh, @description_ja, @search_text,
    @atk, @def, @limited_to_count, @double_sided
  )
`);

let failed = 0;
const tx = db.transaction((items) => {
  for (const c of items) {
    try {
      const canonical = c.card_no.toUpperCase();
      insert.run({
        card_id: toScId(canonical),
        canonical_id: canonical,
        locale: 'sc',
        card_set: c.from.toUpperCase(),
        card_number: `${canonical.split('-')[1] ?? ''}SC`,
        kind: c.card_type,
        class: c.craft,
        trait: c.type ?? '',
        name: c.name_cn || c.name_jp || canonical,
        name_en: '',
        name_zh: c.name_cn,
        name_ja: c.name_jp,
        img_url: '',
        cost: c.cost,
        description: c.desc_cn || c.desc_jp || '',
        description_en: '',
        description_zh: c.desc_cn,
        description_ja: c.desc_jp,
        search_text: `${canonical} ${c.name_cn} ${c.name_jp}`.toLowerCase(),
        atk: c.attack,
        def: c.life,
        limited_to_count: 3,
        double_sided: c.has_back ? 1 : 0,
      });
    } catch (e) {
      failed++;
      if (failed <= 5) console.error('insert fail', c.card_no, e.message);
      throw e;
    }
  }
});

try {
  tx(cards);
  console.log('insert ok', cards.length);
} catch (e) {
  console.error('transaction failed', e.message);
}

db.close();
fs.unlinkSync(tmp);
