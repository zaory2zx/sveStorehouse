import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ONEDRIVE_SYNC_FILE = 'sync.json';

export const ONEDRIVE_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'Files.ReadWrite.AppFolder',
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLACEHOLDER_IDS = new Set([
  '',
  'PASTE_YOUR_CLIENT_ID_HERE',
  '在此填入 Azure 应用注册的客户端 ID',
]);

function readConfigFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      clientId?: string;
    };
    const clientId = raw.clientId?.trim();
    if (!clientId || PLACEHOLDER_IDS.has(clientId)) return null;
    return clientId;
  } catch {
    return null;
  }
}

export function getOneDriveConfigPaths(): string[] {
  return [
    path.join(app.getPath('userData'), 'onedrive.config.json'),
    path.join(__dirname, 'onedrive.config.json'),
    path.join(process.cwd(), 'electron', 'onedrive.config.json'),
    path.join(app.getAppPath(), 'electron', 'onedrive.config.json'),
  ];
}

export function getOneDriveClientId(): string | null {
  const fromEnv = process.env.ONEDRIVE_CLIENT_ID?.trim();
  if (fromEnv && !PLACEHOLDER_IDS.has(fromEnv)) {
    return fromEnv;
  }

  for (const filePath of getOneDriveConfigPaths()) {
    const clientId = readConfigFile(filePath);
    if (clientId) return clientId;
  }

  return null;
}

export function isOneDriveConfigured(): boolean {
  return getOneDriveClientId() !== null;
}

export function getMsalCachePath(): string {
  return path.join(app.getPath('userData'), 'onedrive-msal-cache.json');
}

export function getOneDriveMetaPath(): string {
  return path.join(app.getPath('userData'), 'onedrive-sync-meta.json');
}

export interface OneDriveSyncMeta {
  lastSyncAt: string | null;
  lastAction: 'upload' | 'download' | 'none' | null;
}

export function readOneDriveSyncMeta(): OneDriveSyncMeta {
  const filePath = getOneDriveMetaPath();
  if (!fs.existsSync(filePath)) {
    return { lastSyncAt: null, lastAction: null };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OneDriveSyncMeta;
  } catch {
    return { lastSyncAt: null, lastAction: null };
  }
}

export function writeOneDriveSyncMeta(meta: OneDriveSyncMeta): void {
  fs.writeFileSync(getOneDriveMetaPath(), JSON.stringify(meta, null, 2), 'utf-8');
}
