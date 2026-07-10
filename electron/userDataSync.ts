import os from 'os';
import type { CardVariant, TradeType } from './db.js';
import { getDatabase } from './db.js';

export const USER_DATA_VERSION = 1;

export interface UserDataEntry {
  card_id: string;
  variant: CardVariant;
  quantity: number;
}

export interface UserDataTradeItem {
  card_id: string;
  variant: CardVariant;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
}

export interface UserDataTradeOrder {
  trade_type: TradeType;
  counterparty: string | null;
  traded_at: string;
  note: string | null;
  total_amount: number | null;
  from_for_sale: number;
  items: UserDataTradeItem[];
}

export interface UserDataSnapshot {
  version: typeof USER_DATA_VERSION;
  updated_at: string;
  device: string;
  inventory: UserDataEntry[];
  cart: UserDataEntry[];
  for_sale: UserDataEntry[];
  trade_orders: UserDataTradeOrder[];
}

export interface UserDataMeta {
  updated_at: string;
  device: string;
  inventoryCount: number;
  tradeOrderCount: number;
}

function readEntries(table: 'inventory' | 'cart' | 'for_sale'): UserDataEntry[] {
  const database = getDatabase();
  return database
    .prepare(
      `SELECT card_id, variant, quantity
       FROM ${table}
       WHERE quantity > 0
       ORDER BY card_id, variant`,
    )
    .all() as UserDataEntry[];
}

function readTradeOrders(): UserDataTradeOrder[] {
  const database = getDatabase();
  const orders = database
    .prepare(
      `SELECT id, trade_type, counterparty, traded_at, note, total_amount, from_for_sale
       FROM trade_orders
       ORDER BY traded_at ASC, id ASC`,
    )
    .all() as Array<Omit<UserDataTradeOrder, 'items'> & { id: number }>;

  const itemsStmt = database.prepare(
    `SELECT card_id, variant, quantity, unit_price, line_total
     FROM trade_items
     WHERE order_id = ?
     ORDER BY id ASC`,
  );

  return orders.map(({ id, ...order }) => ({
    ...order,
    items: itemsStmt.all(id) as UserDataTradeItem[],
  }));
}

export function exportUserData(): UserDataSnapshot {
  const inventory = readEntries('inventory');
  const cart = readEntries('cart');
  const for_sale = readEntries('for_sale');
  const trade_orders = readTradeOrders();

  return {
    version: USER_DATA_VERSION,
    updated_at: new Date().toISOString(),
    device: os.hostname(),
    inventory,
    cart,
    for_sale,
    trade_orders,
  };
}

export function getLocalUserDataMeta(): UserDataMeta {
  const snapshot = exportUserData();
  return {
    updated_at: snapshot.updated_at,
    device: snapshot.device,
    inventoryCount: snapshot.inventory.length,
    tradeOrderCount: snapshot.trade_orders.length,
  };
}

function assertSnapshot(data: unknown): asserts data is UserDataSnapshot {
  if (!data || typeof data !== 'object') {
    throw new Error('备份文件格式无效');
  }

  const snapshot = data as Partial<UserDataSnapshot>;
  if (snapshot.version !== USER_DATA_VERSION) {
    throw new Error(`不支持的备份版本：${String(snapshot.version)}`);
  }
  if (!snapshot.updated_at || typeof snapshot.updated_at !== 'string') {
    throw new Error('备份文件缺少更新时间');
  }

  for (const key of ['inventory', 'cart', 'for_sale', 'trade_orders'] as const) {
    if (!Array.isArray(snapshot[key])) {
      throw new Error(`备份文件缺少 ${key} 数据`);
    }
  }
}

function replaceEntries(
  table: 'inventory' | 'cart' | 'for_sale',
  entries: UserDataEntry[],
) {
  const database = getDatabase();
  database.prepare(`DELETE FROM ${table}`).run();

  const insert = database.prepare(
    `INSERT INTO ${table} (card_id, variant, quantity) VALUES (?, ?, ?)`,
  );

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    insert.run(entry.card_id, entry.variant, entry.quantity);
  }
}

export function importUserData(raw: unknown): UserDataMeta {
  assertSnapshot(raw);
  const snapshot = raw;
  const database = getDatabase();

  database.transaction(() => {
    replaceEntries('inventory', snapshot.inventory);
    replaceEntries('cart', snapshot.cart);
    replaceEntries('for_sale', snapshot.for_sale);

    database.prepare('DELETE FROM trade_items').run();
    database.prepare('DELETE FROM trade_orders').run();

    const insertOrder = database.prepare(
      `INSERT INTO trade_orders (
        trade_type, counterparty, traded_at, note, total_amount, from_for_sale
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertItem = database.prepare(
      `INSERT INTO trade_items (
        order_id, card_id, variant, quantity, unit_price, line_total
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    );

    for (const order of snapshot.trade_orders) {
      const result = insertOrder.run(
        order.trade_type,
        order.counterparty,
        order.traded_at,
        order.note,
        order.total_amount,
        order.from_for_sale ? 1 : 0,
      );
      const orderId = Number(result.lastInsertRowid);
      for (const item of order.items) {
        insertItem.run(
          orderId,
          item.card_id,
          item.variant,
          item.quantity,
          item.unit_price,
          item.line_total,
        );
      }
    }
  })();

  return {
    updated_at: snapshot.updated_at,
    device: snapshot.device ?? 'unknown',
    inventoryCount: snapshot.inventory.length,
    tradeOrderCount: snapshot.trade_orders.length,
  };
}

export function parseUserDataSnapshot(text: string): UserDataSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('备份文件不是有效的 JSON');
  }
  assertSnapshot(parsed);
  return parsed;
}

export function compareSnapshots(
  local: UserDataSnapshot,
  remote: UserDataSnapshot | null,
): 'upload' | 'download' | 'none' {
  if (!remote) return 'upload';

  const localTime = Date.parse(local.updated_at);
  const remoteTime = Date.parse(remote.updated_at);
  if (Number.isNaN(localTime) || Number.isNaN(remoteTime)) {
    throw new Error('备份时间格式无效');
  }

  if (localTime > remoteTime) return 'upload';
  if (remoteTime > localTime) return 'download';
  return 'none';
}
