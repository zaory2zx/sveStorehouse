import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'electron', 'onedrive.config.json');
const target = path.join(root, 'dist-electron', 'onedrive.config.json');

if (!fs.existsSync(source)) {
  console.warn(
    '[onedrive] 未找到 electron/onedrive.config.json，OneDrive 云同步将不可用（离线备份仍正常）。',
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log('[onedrive] 已复制 onedrive.config.json -> dist-electron/');
