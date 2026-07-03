import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

const roots = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'sve-inventory', 'inventory.db'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'sve-inventory', 'inventory.db'),
];

for (const root of fs.readdirSync(path.join(os.homedir(), 'AppData', 'Roaming'))) {
  const candidate = path.join(
    os.homedir(),
    'AppData',
    'Roaming',
    root,
    'sve-inventory',
    'inventory.db',
  );
  if (fs.existsSync(candidate)) roots.push(candidate);
}

const seen = new Set();
for (const p of roots) {
  if (seen.has(p) || !fs.existsSync(p)) continue;
  seen.add(p);
  const db = new Database(p, { readonly: true });
  const cols = db
    .prepare('PRAGMA table_info(cards)')
    .all()
    .map((c: { name: string }) => c.name);
  const total = (db.prepare('SELECT COUNT(*) as c FROM cards').get() as { c: number }).c;
  const hasLocale = cols.includes('locale');
  let sc = 0;
  let en = 0;
  if (hasLocale) {
    sc = (db.prepare("SELECT COUNT(*) as c FROM cards WHERE locale = 'sc'").get() as { c: number }).c;
    en = (db.prepare("SELECT COUNT(*) as c FROM cards WHERE locale = 'en'").get() as { c: number }).c;
  }
  const sample = hasLocale
    ? db
        .prepare(
          "SELECT card_id, name_zh, name FROM cards WHERE locale = 'sc' LIMIT 3",
        )
        .all()
    : [];
  console.log(JSON.stringify({ path: p, total, hasLocale, sc, en, sample }, null, 2));
  db.close();
}

if (seen.size === 0) {
  console.log(
    JSON.stringify({
      found: false,
      message: '未找到 inventory.db，说明应用尚未成功完成首次启动/同步',
    }),
  );
}
