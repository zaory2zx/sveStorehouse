import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  exportUserData,
  importUserData,
  parseUserDataSnapshot,
  type UserDataMeta,
} from './userDataSync.js';

const BACKUP_FILTER = {
  name: 'SVE 小仓库备份',
  extensions: ['svebackup', 'json'],
};

export async function exportUserDataToFile(): Promise<{
  saved: boolean;
  filePath?: string;
  meta?: UserDataMeta;
}> {
  const snapshot = exportUserData();
  const defaultName = `sve-backup-${snapshot.updated_at.slice(0, 10)}.svebackup`;

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '导出数据',
    defaultPath: defaultName,
    filters: [BACKUP_FILTER],
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  const normalized = path.normalize(filePath);
  fs.writeFileSync(normalized, JSON.stringify(snapshot, null, 2), 'utf-8');

  return {
    saved: true,
    filePath: normalized,
    meta: {
      updated_at: snapshot.updated_at,
      device: snapshot.device,
      inventoryCount: snapshot.inventory.length,
      tradeOrderCount: snapshot.trade_orders.length,
    },
  };
}

export async function importUserDataFromFile(): Promise<{
  imported: boolean;
  filePath?: string;
  meta?: UserDataMeta;
}> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '导入数据',
    properties: ['openFile'],
    filters: [BACKUP_FILTER],
  });

  if (canceled || !filePaths[0]) {
    return { imported: false };
  }

  const filePath = path.normalize(filePaths[0]);
  const text = fs.readFileSync(filePath, 'utf-8');
  const snapshot = parseUserDataSnapshot(text);
  const meta = importUserData(snapshot);

  return { imported: true, filePath, meta };
}
