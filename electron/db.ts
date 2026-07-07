import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  buildSearchText,
  mapCraft,
  normalizeRare,
  toCanonicalId,
} from './cardUtils.js';
import { fetchJsonFromUrls } from './fetchUtils.js';
import { fetchAllSveHelperCards, sveHelperToUnifiedRecord } from './zhSync.js';

const CARDS_JSON_URLS = [
  'https://cdn.jsdelivr.net/gh/capnkenny/SVEDB_Extract@main/cards.json',
  'https://raw.githubusercontent.com/capnkenny/SVEDB_Extract/main/cards.json',
] as const;

export type CardVariant = 'normal' | 'premium' | 'alt_art' | 'pr';
export type CardLocale = 'en' | 'sc';
export type TradeType = 'buy' | 'sell' | 'exchange';

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
  rare: string;
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
  rare?: string;
  for_sale_quantity?: number;
}

export type CartRow = InventoryRow;
export type ForSaleRow = InventoryRow;

export interface CartFilters extends InventoryFilters {}

export type ForSaleFilters = InventoryFilters;

export interface SellFromForSaleInput {
  items: CreateOrderItemInput[];
  counterparty?: string | null;
  tradedAt?: string;
  note?: string | null;
}

export interface CreateOrderItemInput {
  cardId: string;
  variant: CardVariant;
  quantity: number;
  unitPrice?: number | null;
}

export interface CreateOrderInput {
  tradeType: TradeType;
  items: CreateOrderItemInput[];
  counterparty?: string | null;
  tradedAt?: string;
  note?: string | null;
  totalAmount?: number | null;
  adjustInventory?: boolean;
  fromForSale?: boolean;
}

export interface TradeItemRow {
  id: number;
  order_id: number;
  card_id: string;
  variant: CardVariant;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  name?: string;
  name_zh?: string;
  img_url?: string;
}

export interface TradeOrderRow {
  id: number;
  trade_type: TradeType;
  counterparty: string | null;
  traded_at: string;
  note: string | null;
  total_amount: number | null;
  from_for_sale: number;
  items: TradeItemRow[];
}

export interface CardFilters {
  query?: string;
  cardSet?: string;
  classType?: string;
  kind?: string;
  rare?: string;
  cost?: number | null;
  locale?: CardLocale | '';
  limit?: number;
  offset?: number;
}

export interface InventoryFilters {
  query?: string;
  cardSet?: string;
  classType?: string;
  kind?: string;
  variant?: string;
  rare?: string;
  cost?: number | null;
  locale?: CardLocale | '';
  limit?: number;
  offset?: number;
}

export interface CardQuantities {
  inventory: number;
  forSale: number;
  cart: number;
}

export interface SyncResult {
  count: number;
  total: number;
  cached?: boolean;
  syncError?: string | null;
}

export interface StatsSummary {
  totalCards: number;
  uniqueCards: number;
  byClass: { class: string; count: number }[];
  bySet: { card_set: string; count: number }[];
  byVariant: { variant: string; count: number }[];
  byRare: { rare: string; count: number }[];
}

let db: Database.Database | null = null;

const SYNC_ERROR_META_KEY = 'zh_sync_error';

function setPersistedSyncError(error: string | null) {
  const database = getDatabase();
  if (error) {
    database
      .prepare(
        `INSERT INTO app_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(SYNC_ERROR_META_KEY, error);
  } else {
    database
      .prepare('DELETE FROM app_meta WHERE key = ?')
      .run(SYNC_ERROR_META_KEY);
  }
}

export function getPersistedSyncError(): string | null {
  const database = getDatabase();
  const row = database
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get(SYNC_ERROR_META_KEY) as { value: string } | undefined;
  return row?.value ?? null;
}

function getDbPath(): string {
  const dir = path.join(app.getPath('userData'), 'sve-inventory');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'inventory.db');
}

function migrateSchema(database: Database.Database) {
  const cols = (
    database.prepare('PRAGMA table_info(cards)').all() as { name: string }[]
  ).map((c) => c.name);
  const has = (name: string) => cols.includes(name);

  const additions: [string, string][] = [
    ['canonical_id', 'TEXT'],
    ['locale', "TEXT DEFAULT 'en'"],
    ['name_en', 'TEXT'],
    ['name_zh', 'TEXT'],
    ['name_ja', 'TEXT'],
    ['description_en', 'TEXT'],
    ['description_zh', 'TEXT'],
    ['description_ja', 'TEXT'],
    ['search_text', 'TEXT'],
    ['rare', 'TEXT'],
  ];

  for (const [name, def] of additions) {
    if (!has(name)) {
      database.exec(`ALTER TABLE cards ADD COLUMN ${name} ${def}`);
    }
  }

  database.exec(`
    UPDATE cards SET canonical_id = card_id WHERE canonical_id IS NULL OR canonical_id = '';
    UPDATE cards SET locale = 'en' WHERE locale IS NULL OR locale = '';
    UPDATE cards SET name_en = name WHERE name_en IS NULL OR name_en = '';
    UPDATE cards SET description_en = description WHERE description_en IS NULL OR description_en = '';
  `);

  database.exec(`
    UPDATE cards
    SET canonical_id = UPPER(REPLACE(REPLACE(card_id, 'EN', ''), 'SC', ''))
    WHERE card_id LIKE '%EN' OR card_id LIKE '%SC';
  `);
}

function rebuildAllSearchText(database: Database.Database) {
  const rows = database
    .prepare(
      `SELECT card_id, canonical_id, name_en, name_zh, name_ja,
              description_en, description_zh, description_ja, trait, card_set, rare
       FROM cards`,
    )
    .all() as CardRow[];

  const update = database.prepare(
    'UPDATE cards SET search_text = ? WHERE card_id = ?',
  );
  const tx = database.transaction(() => {
    for (const row of rows) {
      update.run(
        buildSearchText([
          row.canonical_id,
          row.card_id,
          row.name_en,
          row.name_zh,
          row.name_ja,
          row.description_en,
          row.description_zh,
          row.description_ja,
          row.trait,
          row.card_set,
          row.rare,
        ]),
        row.card_id,
      );
    }
  });
  tx();
}

function migrateToUnifiedCards(database: Database.Database) {
  const version = database.pragma('user_version', { simple: true }) as number;
  if (version >= 2) return;

  database.exec(`
    UPDATE cards
    SET canonical_id = UPPER(REPLACE(REPLACE(card_id, 'EN', ''), 'SC', ''))
    WHERE canonical_id IS NULL OR canonical_id = '' OR card_id LIKE '%EN' OR card_id LIKE '%SC';
  `);

  database.exec(`
    UPDATE cards AS sc
    SET
      name_en = COALESCE(
        NULLIF(sc.name_en, ''),
        (SELECT en.name FROM cards en WHERE en.canonical_id = sc.canonical_id AND en.locale = 'en' LIMIT 1),
        sc.name_en
      ),
      description_en = COALESCE(
        NULLIF(sc.description_en, ''),
        (SELECT en.description FROM cards en WHERE en.canonical_id = sc.canonical_id AND en.locale = 'en' LIMIT 1),
        sc.description_en
      ),
      img_url = COALESCE(
        NULLIF(sc.img_url, ''),
        (SELECT en.img_url FROM cards en WHERE en.canonical_id = sc.canonical_id AND en.locale = 'en' LIMIT 1),
        sc.img_url
      )
    WHERE sc.locale = 'sc';
  `);

  database.exec(`
    UPDATE cards
    SET locale = 'sc', card_id = canonical_id
    WHERE locale = 'en'
      AND canonical_id NOT IN (SELECT canonical_id FROM cards WHERE locale = 'sc');
  `);

  database.exec(`DELETE FROM cards WHERE locale = 'en'`);
  database.exec(
    `UPDATE cards SET card_id = canonical_id WHERE card_id != canonical_id`,
  );

  const invRows = database
    .prepare(
      `SELECT i.id, i.card_id, i.variant, i.quantity, c.canonical_id
       FROM inventory i
       LEFT JOIN cards c ON c.card_id = i.card_id`,
    )
    .all() as {
    id: number;
    card_id: string;
    variant: string;
    quantity: number;
    canonical_id: string | null;
  }[];

  const mergedInv = new Map<string, number>();
  for (const row of invRows) {
    const canonical = row.canonical_id || toCanonicalId(row.card_id);
    const key = `${canonical}\0${row.variant}`;
    mergedInv.set(key, (mergedInv.get(key) ?? 0) + row.quantity);
  }

  const mergeInventory = database.transaction(() => {
    database.prepare('DELETE FROM inventory').run();
    const insert = database.prepare(
      'INSERT INTO inventory (card_id, variant, quantity) VALUES (?, ?, ?)',
    );
    for (const [key, qty] of mergedInv) {
      if (qty <= 0) continue;
      const sep = key.indexOf('\0');
      insert.run(key.slice(0, sep), key.slice(sep + 1), qty);
    }
  });
  mergeInventory();

  const trades = database
    .prepare('SELECT id, card_id FROM trades')
    .all() as { id: number; card_id: string }[];
  const updateTrade = database.prepare(
    'UPDATE trades SET card_id = ? WHERE id = ?',
  );
  const migrateTrades = database.transaction(() => {
    for (const trade of trades) {
      updateTrade.run(toCanonicalId(trade.card_id), trade.id);
    }
  });
  migrateTrades();

  rebuildAllSearchText(database);
  database.pragma('user_version = 2');
}

function migrateShadowcraftClass(database: Database.Database) {
  const version = database.pragma('user_version', { simple: true }) as number;
  if (version >= 3) return;

  database.exec(
    `UPDATE cards SET class = 'Abysscraft' WHERE class = 'Shadowcraft'`,
  );
  database.pragma('user_version = 3');
}

function migrateToTradeOrders(database: Database.Database) {
  const version = database.pragma('user_version', { simple: true }) as number;
  if (version >= 4) return;

  const hasTrades = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='trades'",
    )
    .get() as { name: string } | undefined;

  if (hasTrades) {
    const oldTrades = database
      .prepare('SELECT * FROM trades ORDER BY id')
      .all() as {
      id: number;
      trade_type: string;
      card_id: string;
      variant: string;
      quantity: number;
      unit_price: number | null;
      total_amount: number | null;
      counterparty: string | null;
      traded_at: string;
      note: string | null;
    }[];

    const insertOrder = database.prepare(
      `INSERT INTO trade_orders (
        trade_type, counterparty, traded_at, note, total_amount, from_for_sale
      ) VALUES (?, ?, ?, ?, ?, 0)`,
    );
    const insertItem = database.prepare(
      `INSERT INTO trade_items (
        order_id, card_id, variant, quantity, unit_price, line_total
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const migrate = database.transaction(() => {
      for (const trade of oldTrades) {
        const lineTotal =
          trade.total_amount ??
          (trade.unit_price !== null ? trade.unit_price * trade.quantity : null);
        const orderResult = insertOrder.run(
          trade.trade_type,
          trade.counterparty,
          trade.traded_at,
          trade.note,
          trade.total_amount,
        );
        insertItem.run(
          Number(orderResult.lastInsertRowid),
          trade.card_id,
          trade.variant,
          trade.quantity,
          trade.unit_price,
          lineTotal,
        );
      }
      database.exec('DROP TABLE trades');
    });
    migrate();
  }

  database.pragma('user_version = 4');
}

function migrateNormalizeRare(database: Database.Database) {
  const version = database.pragma('user_version', { simple: true }) as number;
  if (version >= 5) return;

  const rows = database
    .prepare(
      `SELECT card_id, rare, kind FROM cards
       WHERE COALESCE(rare, '') = '' OR rare = '-'`,
    )
    .all() as { card_id: string; rare: string; kind: string }[];

  const update = database.prepare('UPDATE cards SET rare = ? WHERE card_id = ?');
  const tx = database.transaction(() => {
    for (const row of rows) {
      const normalized = normalizeRare(row.rare, '', row.kind);
      if (normalized !== row.rare) {
        update.run(normalized, row.card_id);
      }
    }
  });
  tx();
  rebuildAllSearchText(database);
  database.pragma('user_version = 5');
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      card_id TEXT PRIMARY KEY,
      canonical_id TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL DEFAULT 'en',
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
      rare TEXT,
      atk INTEGER,
      def INTEGER,
      limited_to_count INTEGER DEFAULT 3,
      double_sided INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'normal',
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(card_id, variant),
      FOREIGN KEY (card_id) REFERENCES cards(card_id)
    );

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'normal',
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(card_id, variant),
      FOREIGN KEY (card_id) REFERENCES cards(card_id)
    );

    CREATE TABLE IF NOT EXISTS for_sale (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'normal',
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(card_id, variant),
      FOREIGN KEY (card_id) REFERENCES cards(card_id)
    );

    CREATE TABLE IF NOT EXISTS trade_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_type TEXT NOT NULL,
      counterparty TEXT,
      traded_at TEXT NOT NULL,
      note TEXT,
      total_amount REAL,
      from_for_sale INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trade_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      card_id TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'normal',
      quantity INTEGER NOT NULL,
      unit_price REAL,
      line_total REAL,
      FOREIGN KEY (order_id) REFERENCES trade_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(card_id)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_type TEXT NOT NULL,
      card_id TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'normal',
      quantity INTEGER NOT NULL,
      unit_price REAL,
      total_amount REAL,
      counterparty TEXT,
      traded_at TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(card_id)
    );
  `);

  migrateSchema(database);
  migrateToUnifiedCards(database);
  migrateShadowcraftClass(database);
  migrateToTradeOrders(database);
  migrateNormalizeRare(database);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
    CREATE INDEX IF NOT EXISTS idx_cards_search ON cards(search_text);
    CREATE INDEX IF NOT EXISTS idx_cards_canonical ON cards(canonical_id);
    CREATE INDEX IF NOT EXISTS idx_cards_locale ON cards(locale);
    CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(card_set);
    CREATE INDEX IF NOT EXISTS idx_cards_class ON cards(class);
    CREATE INDEX IF NOT EXISTS idx_inventory_card ON inventory(card_id);
    CREATE INDEX IF NOT EXISTS idx_cart_card ON cart(card_id);
    CREATE INDEX IF NOT EXISTS idx_for_sale_card ON for_sale(card_id);
    CREATE INDEX IF NOT EXISTS idx_trade_orders_date ON trade_orders(traded_at);
    CREATE INDEX IF NOT EXISTS idx_trade_items_order ON trade_items(order_id);
  `);
}

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

interface RawCard {
  cardId: string;
  cardSet: string;
  cardNumber: string;
  kind: string;
  class: string;
  trait: string;
  name: string;
  imgUrl: string;
  cost: number;
  description: string;
  atk: number;
  def: number;
  limitedToCount: number;
  doubleSided: boolean;
}

const UPSERT_CARD = `
  INSERT INTO cards (
    card_id, canonical_id, locale, card_set, card_number, kind, class, trait,
    name, name_en, name_zh, name_ja, img_url, cost, description,
    description_en, description_zh, description_ja, search_text, rare,
    atk, def, limited_to_count, double_sided
  ) VALUES (
    @card_id, @canonical_id, @locale, @card_set, @card_number, @kind, @class, @trait,
    @name, @name_en, @name_zh, @name_ja, @img_url, @cost, @description,
    @description_en, @description_zh, @description_ja, @search_text, @rare,
    @atk, @def, @limited_to_count, @double_sided
  )
  ON CONFLICT(card_id) DO UPDATE SET
    canonical_id = excluded.canonical_id,
    locale = excluded.locale,
    card_set = excluded.card_set,
    card_number = excluded.card_number,
    kind = excluded.kind,
    class = excluded.class,
    trait = excluded.trait,
    name = excluded.name,
    name_en = excluded.name_en,
    name_zh = excluded.name_zh,
    name_ja = excluded.name_ja,
    img_url = excluded.img_url,
    cost = excluded.cost,
    description = excluded.description,
    description_en = excluded.description_en,
    description_zh = excluded.description_zh,
    description_ja = excluded.description_ja,
    search_text = excluded.search_text,
    rare = excluded.rare,
    atk = excluded.atk,
    def = excluded.def,
    limited_to_count = excluded.limited_to_count,
    double_sided = excluded.double_sided
`;

function upsertUnifiedCards(
  database: Database.Database,
  records: ReturnType<typeof sveHelperToUnifiedRecord>[],
) {
  const insert = database.prepare(UPSERT_CARD);
  const tx = database.transaction((items: typeof records) => {
    for (const c of items) {
      insert.run(c);
    }
  });
  tx(records);
}

function upsertEnFallbackCards(
  database: Database.Database,
  cards: RawCard[],
  skipCanonicals: Set<string>,
) {
  const insert = database.prepare(UPSERT_CARD);
  const tx = database.transaction((items: RawCard[]) => {
    for (const c of items) {
      const canonical = toCanonicalId(c.cardId);
      if (skipCanonicals.has(canonical)) continue;
      insert.run({
        card_id: canonical,
        canonical_id: canonical,
        locale: 'sc',
        card_set: c.cardSet,
        card_number: c.cardNumber.replace(/SC$/i, ''),
        kind: c.kind,
        class: mapCraft(c.class),
        trait: c.trait ?? '',
        name: c.name,
        name_en: c.name,
        name_zh: '',
        name_ja: '',
        img_url: c.imgUrl,
        cost: c.cost,
        description: c.description ?? '',
        description_en: c.description ?? '',
        description_zh: '',
        description_ja: '',
        search_text: buildSearchText([
          canonical,
          c.name,
          c.description,
          c.trait,
          c.cardSet,
        ]),
        rare: '',
        atk: c.atk,
        def: c.def,
        limited_to_count: c.limitedToCount ?? 3,
        double_sided: c.doubleSided ? 1 : 0,
      });
    }
  });
  tx(cards);
}

export async function syncCardDatabase(): Promise<SyncResult> {
  const database = getDatabase();

  const enCards = await fetchJsonFromUrls<RawCard[]>(
    CARDS_JSON_URLS,
    '卡库',
  );

  const enNameByCanonical = new Map<string, string>();
  const enDescByCanonical = new Map<string, string>();
  for (const c of enCards) {
    const canonical = toCanonicalId(c.cardId);
    enNameByCanonical.set(canonical, c.name);
    enDescByCanonical.set(canonical, c.description ?? '');
  }

  let syncError: string | null = null;
  let syncedCanonicals = new Set<string>();

  try {
    const zhCards = await fetchAllSveHelperCards();
    const records = zhCards.map((c) =>
      sveHelperToUnifiedRecord(c, enNameByCanonical, enDescByCanonical),
    );
    upsertUnifiedCards(database, records);
    syncedCanonicals = new Set(records.map((r) => r.canonical_id));
  } catch (error) {
    syncError = error instanceof Error ? error.message : String(error);
    console.error('简中卡库同步失败，将尝试仅保留英文数据:', error);
  }

  upsertEnFallbackCards(database, enCards, syncedCanonicals);
  rebuildAllSearchText(database);

  const total = getCardCount();
  return { count: total, total, syncError };
}

export function getCardCount(): number {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) as count FROM cards').get() as {
    count: number;
  };
  return row.count;
}

function buildSearchCondition(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `(
    ${p}search_text LIKE @query OR
    ${p}card_id LIKE @query OR
    ${p}canonical_id LIKE @query OR
    ${p}name LIKE @query OR
    ${p}name_zh LIKE @query OR
    ${p}name_en LIKE @query OR
    ${p}name_ja LIKE @query OR
    ${p}description LIKE @query OR
    ${p}description_zh LIKE @query OR
    ${p}trait LIKE @query
  )`;
}

function buildCardFilterClause(filters: CardFilters): {
  where: string;
  params: Record<string, string | number>;
} {
  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.query?.trim()) {
    conditions.push(buildSearchCondition());
    params.query = `%${filters.query.trim()}%`;
  }
  if (filters.cardSet) {
    conditions.push('card_set = @cardSet');
    params.cardSet = filters.cardSet;
  }
  if (filters.classType) {
    conditions.push('class = @classType');
    params.classType = filters.classType;
  }
  if (filters.kind) {
    conditions.push('kind = @kind');
    params.kind = filters.kind;
  }
  if (filters.rare !== undefined) {
    conditions.push('COALESCE(rare, \'\') = @rare');
    params.rare = filters.rare;
  }
  if (filters.cost !== undefined && filters.cost !== null) {
    conditions.push('cost = @cost');
    params.cost = filters.cost;
  }
  if (filters.locale) {
    // 已统一为单卡，忽略印刷筛选
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

export function countSearchCards(filters: CardFilters = {}): number {
  const database = getDatabase();
  const { where, params } = buildCardFilterClause(filters);
  const row = database
    .prepare(`SELECT COUNT(*) as count FROM cards ${where}`)
    .get(params) as { count: number };
  return row.count;
}

export function searchCards(filters: CardFilters = {}): CardRow[] {
  const database = getDatabase();
  const { where, params } = buildCardFilterClause(filters);
  const limit = filters.limit ?? 60;
  const offset = filters.offset ?? 0;

  return database
    .prepare(
      `SELECT * FROM cards ${where}
       ORDER BY card_set, card_id
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as CardRow[];
}

export function getCardSets(): string[] {
  const database = getDatabase();
  return (
    database
      .prepare('SELECT DISTINCT card_set FROM cards ORDER BY card_set')
      .all() as { card_set: string }[]
  ).map((r) => r.card_set);
}

const RARE_SORT_ORDER = [
  'BR',
  'SR',
  'GR',
  'LG',
  'LD',
  'BR_P',
  'SR_P',
  'GR_P',
  'SL',
  'UR',
  'SP',
  'PR',
  'SSP',
  'TK',
  '-',
  '',
];

export function getCardRares(): string[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `SELECT DISTINCT COALESCE(rare, '') as rare FROM cards ORDER BY rare`,
    )
    .all() as { rare: string }[];
  const order = new Map(RARE_SORT_ORDER.map((v, i) => [v, i]));
  return rows
    .map((r) => r.rare)
    .sort(
      (a, b) =>
        (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b),
    );
}

export function getInventory(filters: InventoryFilters = {}): InventoryRow[] {
  const database = getDatabase();
  const { where, params } = buildCardListFilterConditions('i', filters);
  const limit = filters.limit ?? 200;
  const offset = filters.offset ?? 0;

  return database
    .prepare(
      `SELECT i.*, COALESCE(fs.quantity, 0) as for_sale_quantity,
              c.name, c.name_zh, c.name_en, c.locale, c.class, c.kind, c.cost,
              c.atk, c.def, c.img_url, c.card_set, c.description, c.description_zh,
              c.rare
       FROM inventory i
       JOIN cards c ON c.card_id = i.card_id
       LEFT JOIN for_sale fs ON fs.card_id = i.card_id AND fs.variant = i.variant
       ${where}
       ORDER BY c.card_set, COALESCE(c.name_zh, c.name), i.variant
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as InventoryRow[];
}

export function getCart(filters: CartFilters = {}): CartRow[] {
  return queryCardList('cart', filters);
}

export function getForSale(filters: ForSaleFilters = {}): ForSaleRow[] {
  return queryCardList('for_sale', filters);
}

export function getCardQuantities(cardId: string): CardQuantities {
  const database = getDatabase();
  const resolvedId = resolveCardId(cardId);

  const sumTable = (table: 'inventory' | 'for_sale' | 'cart') => {
    const row = database
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) as total FROM ${table} WHERE card_id = ?`,
      )
      .get(resolvedId) as { total: number };
    return row.total;
  };

  return {
    inventory: sumTable('inventory'),
    forSale: sumTable('for_sale'),
    cart: sumTable('cart'),
  };
}

function buildCardListFilterConditions(
  alias: string,
  filters: InventoryFilters,
): { where: string; params: Record<string, string | number> } {
  const conditions: string[] = [`${alias}.quantity > 0`];
  const params: Record<string, string | number> = {};

  if (filters.query?.trim()) {
    conditions.push(buildSearchCondition('c'));
    params.query = `%${filters.query.trim()}%`;
  }
  if (filters.cardSet) {
    conditions.push('c.card_set = @cardSet');
    params.cardSet = filters.cardSet;
  }
  if (filters.classType) {
    conditions.push('c.class = @classType');
    params.classType = filters.classType;
  }
  if (filters.kind) {
    conditions.push('c.kind = @kind');
    params.kind = filters.kind;
  }
  if (filters.variant) {
    conditions.push(`${alias}.variant = @variant`);
    params.variant = filters.variant;
  }
  if (filters.rare !== undefined) {
    conditions.push(`COALESCE(c.rare, '') = @rare`);
    params.rare = filters.rare;
  }
  if (filters.cost !== undefined && filters.cost !== null) {
    conditions.push('c.cost = @cost');
    params.cost = filters.cost;
  }

  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

function queryCardList(
  table: 'cart' | 'for_sale',
  filters: InventoryFilters,
): InventoryRow[] {
  const database = getDatabase();
  const alias = table === 'cart' ? 'w' : 'f';
  const { where, params } = buildCardListFilterConditions(alias, filters);
  const limit = filters.limit ?? 200;
  const offset = filters.offset ?? 0;

  return database
    .prepare(
      `SELECT ${alias}.*,
              c.name, c.name_zh, c.name_en, c.locale, c.class, c.kind, c.cost,
              c.atk, c.def, c.img_url, c.card_set, c.description, c.description_zh,
              c.rare
       FROM ${table} ${alias}
       JOIN cards c ON c.card_id = ${alias}.card_id
       ${where}
       ORDER BY c.card_set, COALESCE(c.name_zh, c.name), ${alias}.variant
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as InventoryRow[];
}

function resolveCardId(cardId: string): string {
  const database = getDatabase();
  const direct = database
    .prepare('SELECT card_id FROM cards WHERE card_id = ?')
    .get(cardId) as { card_id: string } | undefined;
  if (direct) return direct.card_id;

  const canonical = toCanonicalId(cardId);
  const byCanonical = database
    .prepare(
      'SELECT card_id FROM cards WHERE card_id = ? OR canonical_id = ? LIMIT 1',
    )
    .get(canonical, canonical) as { card_id: string } | undefined;
  if (byCanonical) return byCanonical.card_id;

  throw new Error(`卡牌不存在: ${cardId}`);
}

function adjustCardList(
  table: 'inventory' | 'cart' | 'for_sale',
  cardId: string,
  variant: CardVariant,
  delta: number,
  insufficientLabel: string,
): number {
  const database = getDatabase();
  const resolvedId = resolveCardId(cardId);

  const existing = database
    .prepare(
      `SELECT id, quantity FROM ${table} WHERE card_id = ? AND variant = ?`,
    )
    .get(resolvedId, variant) as { id: number; quantity: number } | undefined;

  if (existing) {
    const newQty = existing.quantity + delta;
    if (newQty < 0) {
      throw new Error(`${insufficientLabel}，当前仅有 ${existing.quantity} 张`);
    }
    if (newQty === 0) {
      database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(existing.id);
      return 0;
    }
    database
      .prepare(`UPDATE ${table} SET quantity = ? WHERE id = ?`)
      .run(newQty, existing.id);
    return newQty;
  }

  if (delta < 0) throw new Error(insufficientLabel);
  database
    .prepare(
      `INSERT INTO ${table} (card_id, variant, quantity) VALUES (?, ?, ?)`,
    )
    .run(resolvedId, variant, delta);
  return delta;
}

function adjustInventory(
  cardId: string,
  variant: CardVariant,
  delta: number,
): number {
  return adjustCardList('inventory', cardId, variant, delta, '库存不足');
}

function adjustCart(
  cardId: string,
  variant: CardVariant,
  delta: number,
): number {
  return adjustCardList('cart', cardId, variant, delta, '数量不足');
}

function adjustForSale(
  cardId: string,
  variant: CardVariant,
  delta: number,
): number {
  return adjustCardList('for_sale', cardId, variant, delta, '待售数量不足');
}

function getCardListQuantity(
  table: 'inventory' | 'for_sale',
  cardId: string,
  variant: CardVariant,
): number {
  const database = getDatabase();
  const resolvedId = resolveCardId(cardId);
  const row = database
    .prepare(
      `SELECT quantity FROM ${table} WHERE card_id = ? AND variant = ?`,
    )
    .get(resolvedId, variant) as { quantity: number } | undefined;
  return row?.quantity ?? 0;
}

export function addInventory(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  return adjustInventory(cardId, variant, quantity);
}

export function removeInventory(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  const resolvedId = resolveCardId(cardId);
  const inventoryQty = getCardListQuantity('inventory', resolvedId, variant);
  const forSaleQty = getCardListQuantity('for_sale', resolvedId, variant);
  if (inventoryQty - quantity < forSaleQty) {
    throw new Error(
      `库存中有 ${forSaleQty} 张待售，请先取消待售或减少待售数量`,
    );
  }
  return adjustInventory(resolvedId, variant, -quantity);
}

export function setInventory(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  return setCardListQuantity('inventory', cardId, variant, quantity);
}

export function addCart(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  return adjustCart(cardId, variant, quantity);
}

export function removeCart(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  return adjustCart(cardId, variant, -quantity);
}

export function setCart(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  return setCardListQuantity('cart', cardId, variant, quantity);
}

export function markForSale(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  const resolvedId = resolveCardId(cardId);
  const inventoryQty = getCardListQuantity('inventory', resolvedId, variant);
  const forSaleQty = getCardListQuantity('for_sale', resolvedId, variant);
  const available = inventoryQty - forSaleQty;
  if (quantity > available) {
    throw new Error(`可标记待售数量不足，当前最多 ${available} 张`);
  }
  return adjustForSale(resolvedId, variant, quantity);
}

export function addToForSale(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  const database = getDatabase();
  const resolvedId = resolveCardId(cardId);

  const run = database.transaction(() => {
    adjustInventory(resolvedId, variant, quantity);
    adjustForSale(resolvedId, variant, quantity);
  });
  run();

  return getCardListQuantity('for_sale', resolvedId, variant);
}

export function unmarkForSale(
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity <= 0) throw new Error('数量必须大于 0');
  return adjustForSale(cardId, variant, -quantity);
}

export function sellFromForSale(input: SellFromForSaleInput): TradeOrderRow {
  return createOrder({
    tradeType: 'sell',
    items: input.items,
    counterparty: input.counterparty,
    tradedAt: input.tradedAt,
    note: input.note,
    fromForSale: true,
    adjustInventory: true,
  });
}

function loadOrderItems(database: Database.Database, orderId: number): TradeItemRow[] {
  return database
    .prepare(
      `SELECT ti.*, c.name, c.name_zh, c.img_url
       FROM trade_items ti
       JOIN cards c ON c.card_id = ti.card_id
       WHERE ti.order_id = ?
       ORDER BY ti.id`,
    )
    .all(orderId) as TradeItemRow[];
}

export function getOrderById(id: number): TradeOrderRow | undefined {
  const database = getDatabase();
  const order = database
    .prepare('SELECT * FROM trade_orders WHERE id = ?')
    .get(id) as Omit<TradeOrderRow, 'items'> | undefined;
  if (!order) return undefined;
  return { ...order, items: loadOrderItems(database, id) };
}

export function createOrder(input: CreateOrderInput): TradeOrderRow {
  const database = getDatabase();
  const {
    tradeType,
    items,
    counterparty = null,
    note = null,
    adjustInventory: shouldAdjustInventory = tradeType !== 'exchange',
    fromForSale = false,
  } = input;

  if (!items.length) throw new Error('订单至少包含一张卡牌');

  const resolvedItems = items.map((item) => {
    if (item.quantity <= 0) throw new Error('数量必须大于 0');
    const resolvedId = resolveCardId(item.cardId);
    const unitPrice = item.unitPrice ?? null;
    const lineTotal =
      unitPrice !== null ? unitPrice * item.quantity : null;
    return {
      resolvedId,
      variant: item.variant,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
    };
  });

  let totalAmount = input.totalAmount ?? null;
  if (totalAmount === null) {
    const sum = resolvedItems.reduce(
      (acc, item) => acc + (item.lineTotal ?? 0),
      0,
    );
    totalAmount = sum > 0 ? sum : null;
  }

  const tradedAt = input.tradedAt ?? new Date().toISOString();

  const orderId = database.transaction(() => {
    if (fromForSale) {
      for (const item of resolvedItems) {
        const forSaleQty = getCardListQuantity(
          'for_sale',
          item.resolvedId,
          item.variant,
        );
        if (forSaleQty < item.quantity) {
          throw new Error(
            `待售数量不足（${item.resolvedId}），当前仅有 ${forSaleQty} 张`,
          );
        }
        const inventoryQty = getCardListQuantity(
          'inventory',
          item.resolvedId,
          item.variant,
        );
        if (inventoryQty < item.quantity) {
          throw new Error(
            `库存不足（${item.resolvedId}），当前仅有 ${inventoryQty} 张`,
          );
        }
      }
    }

    const orderResult = database
      .prepare(
        `INSERT INTO trade_orders (
          trade_type, counterparty, traded_at, note, total_amount, from_for_sale
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tradeType,
        counterparty,
        tradedAt,
        note,
        totalAmount,
        fromForSale ? 1 : 0,
      );

    const oid = Number(orderResult.lastInsertRowid);
    const insertItem = database.prepare(
      `INSERT INTO trade_items (
        order_id, card_id, variant, quantity, unit_price, line_total
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    );

    for (const item of resolvedItems) {
      insertItem.run(
        oid,
        item.resolvedId,
        item.variant,
        item.quantity,
        item.unitPrice,
        item.lineTotal,
      );

      if (shouldAdjustInventory) {
        if (tradeType === 'buy') {
          adjustInventory(item.resolvedId, item.variant, item.quantity);
        } else if (tradeType === 'sell') {
          if (fromForSale) {
            adjustForSale(item.resolvedId, item.variant, -item.quantity);
            adjustInventory(item.resolvedId, item.variant, -item.quantity);
          } else {
            removeInventory(item.resolvedId, item.variant, item.quantity);
          }
        }
      }
    }

    return oid;
  })();

  return getOrderById(orderId)!;
}

export function getOrders(limit = 100, offset = 0): TradeOrderRow[] {
  const database = getDatabase();
  const orders = database
    .prepare(
      `SELECT * FROM trade_orders
       ORDER BY traded_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as Omit<TradeOrderRow, 'items'>[];

  return orders.map((order) => ({
    ...order,
    items: loadOrderItems(database, order.id),
  }));
}

export function deleteOrder(id: number, revertInventory = false): void {
  const database = getDatabase();
  const order = getOrderById(id);
  if (!order) throw new Error('订单不存在');

  if (revertInventory && order.trade_type !== 'exchange') {
    for (const item of order.items) {
      const variant = item.variant as CardVariant;
      if (order.trade_type === 'buy') {
        removeInventory(item.card_id, variant, item.quantity);
      } else if (order.trade_type === 'sell') {
        addInventory(item.card_id, variant, item.quantity);
        if (order.from_for_sale) {
          markForSale(item.card_id, variant, item.quantity);
        }
      }
    }
  }

  database.prepare('DELETE FROM trade_orders WHERE id = ?').run(id);
}

function setCardListQuantity(
  table: 'inventory' | 'cart' | 'for_sale',
  cardId: string,
  variant: CardVariant,
  quantity: number,
): number {
  if (quantity < 0) throw new Error('数量不能为负');
  const database = getDatabase();
  const resolvedId = resolveCardId(cardId);

  if (quantity === 0) {
    database
      .prepare(`DELETE FROM ${table} WHERE card_id = ? AND variant = ?`)
      .run(resolvedId, variant);
    return 0;
  }

  database
    .prepare(
      `INSERT INTO ${table} (card_id, variant, quantity) VALUES (?, ?, ?)
       ON CONFLICT(card_id, variant) DO UPDATE SET quantity = excluded.quantity`,
    )
    .run(resolvedId, variant, quantity);
  return quantity;
}

export function getStats(): StatsSummary {
  const database = getDatabase();

  const totals = database
    .prepare(
      `SELECT
        COALESCE(SUM(quantity), 0) as totalCards,
        COUNT(DISTINCT card_id || ':' || variant) as uniqueCards
       FROM inventory WHERE quantity > 0`,
    )
    .get() as { totalCards: number; uniqueCards: number };

  const byClass = database
    .prepare(
      `SELECT c.class as class, SUM(i.quantity) as count
       FROM inventory i JOIN cards c ON c.card_id = i.card_id
       WHERE i.quantity > 0
       GROUP BY c.class ORDER BY count DESC`,
    )
    .all() as { class: string; count: number }[];

  const bySet = database
    .prepare(
      `SELECT c.card_set as card_set, SUM(i.quantity) as count
       FROM inventory i JOIN cards c ON c.card_id = i.card_id
       WHERE i.quantity > 0
       GROUP BY c.card_set ORDER BY count DESC`,
    )
    .all() as { card_set: string; count: number }[];

  const byVariant = database
    .prepare(
      `SELECT variant, SUM(quantity) as count
       FROM inventory WHERE quantity > 0
       GROUP BY variant ORDER BY count DESC`,
    )
    .all() as { variant: string; count: number }[];

  const byRare = database
    .prepare(
      `SELECT COALESCE(c.rare, '') as rare, SUM(i.quantity) as count
       FROM inventory i JOIN cards c ON c.card_id = i.card_id
       WHERE i.quantity > 0
       GROUP BY COALESCE(c.rare, '') ORDER BY count DESC`,
    )
    .all() as { rare: string; count: number }[];

  return {
    totalCards: totals.totalCards,
    uniqueCards: totals.uniqueCards,
    byClass,
    bySet,
    byVariant,
    byRare,
  };
}

export function getTradeStats(): {
  totalBuy: number;
  totalSell: number;
  netSpent: number;
} {
  const database = getDatabase();
  const buy = database
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM trade_orders WHERE trade_type = 'buy'`,
    )
    .get() as { total: number };
  const sell = database
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM trade_orders WHERE trade_type = 'sell'`,
    )
    .get() as { total: number };

  return {
    totalBuy: buy.total,
    totalSell: sell.total,
    netSpent: buy.total - sell.total,
  };
}
