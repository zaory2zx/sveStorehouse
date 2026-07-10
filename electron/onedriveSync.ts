import {
  type AuthenticationResult,
  type DeviceCodeRequest,
  PublicClientApplication,
} from '@azure/msal-node';
import fs from 'fs';
import {
  getMsalCachePath,
  getOneDriveClientId,
  isOneDriveConfigured,
  ONEDRIVE_SCOPES,
  ONEDRIVE_SYNC_FILE,
  readOneDriveSyncMeta,
  writeOneDriveSyncMeta,
} from './onedriveConfig.js';
import {
  compareSnapshots,
  exportUserData,
  importUserData,
  parseUserDataSnapshot,
  type UserDataSnapshot,
} from './userDataSync.js';

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';
const APP_ROOT_PATH = `/me/drive/special/approot:/${ONEDRIVE_SYNC_FILE}`;

export interface OneDriveDeviceCodeInfo {
  message: string;
  userCode: string;
  verificationUri: string;
}

export interface OneDriveStatus {
  configured: boolean;
  connected: boolean;
  accountName: string | null;
  lastSyncAt: string | null;
  lastAction: 'upload' | 'download' | 'none' | null;
}

export interface OneDriveSyncResult {
  action: 'upload' | 'download' | 'none';
  message: string;
  meta?: {
    updated_at: string;
    device: string;
    inventoryCount: number;
    tradeOrderCount: number;
  };
}

let pca: PublicClientApplication | null = null;
let cachedAccount: AuthenticationResult['account'] | null = null;

function formatAuthError(error: unknown): string {
  const fallback = 'OneDrive 登录失败，请重试';
  if (!error || typeof error !== 'object') return fallback;

  const err = error as {
    errorCode?: string;
    errorMessage?: string;
    subError?: string;
    message?: string;
  };
  const raw = [
    err.errorCode,
    err.subError,
    err.errorMessage,
    err.message,
  ]
    .filter(Boolean)
    .join(' ');

  if (raw.includes('7000218') || raw.includes('client_secret')) {
    return [
      'Azure 应用未开启「允许公共客户端流」。',
      '请在 Entra 管理中心 → 应用注册 → 你的应用 → 身份验证 → 高级设置，',
      '将「允许公共客户端流」设为「是」后保存，再重新连接。',
    ].join('');
  }

  if (raw.includes('65001') || raw.includes('consent')) {
    return [
      '用户尚未同意应用权限。',
      '请在 Azure 应用的 API 权限中添加并授予：',
      'Files.ReadWrite.AppFolder、User.Read，然后重新连接并在浏览器中点「接受」。',
    ].join('');
  }

  if (raw.includes('70000') || raw.includes('unauthorized or expired')) {
    return [
      '请求的权限未获授权或已过期。',
      '请确认 Azure 应用已添加 Files.ReadWrite.AppFolder 权限，',
      '且支持的帐户类型包含「个人 Microsoft 帐户」。',
    ].join('');
  }

  if (raw.includes('authorization_pending')) {
    return '等待浏览器授权中，请在网页完成登录后保持应用窗口打开。';
  }

  if (raw.includes('expired_token') || raw.includes('code_expired')) {
    return '验证码已过期，请重新点击「连接 OneDrive」获取新验证码。';
  }

  if (raw.includes('invalid_grant')) {
    return [
      'OneDrive 授权被拒绝或配置不正确（invalid_grant）。请依次检查：',
      '1) 身份验证 → 允许公共客户端流 = 是；',
      '2) 支持的帐户类型包含个人 Microsoft 帐户；',
      '3) API 权限已添加 Files.ReadWrite.AppFolder 并授予管理员同意；',
      '4) 先在应用中点「断开」，再重新连接。',
    ].join('');
  }

  return err.message || err.errorMessage || fallback;
}

function ensureConfigured(): string {
  const clientId = getOneDriveClientId();
  if (!clientId) {
    throw new Error(
      'OneDrive 未配置。请复制 electron/onedrive.config.example.json 为 onedrive.config.json 并填入客户端 ID。',
    );
  }
  return clientId;
}

function getClient(): PublicClientApplication {
  if (pca) return pca;

  const clientId = ensureConfigured();
  const cachePath = getMsalCachePath();

  pca = new PublicClientApplication({
    auth: {
      clientId,
      authority: 'https://login.microsoftonline.com/common',
    },
    cache: {
      cachePlugin: {
        beforeCacheAccess: async (context) => {
          if (fs.existsSync(cachePath)) {
            context.tokenCache.deserialize(fs.readFileSync(cachePath, 'utf-8'));
          }
        },
        afterCacheAccess: async (context) => {
          if (context.cacheHasChanged) {
            fs.writeFileSync(cachePath, context.tokenCache.serialize());
          }
        },
      },
    },
  });

  return pca;
}

async function acquireTokenSilent(): Promise<AuthenticationResult | null> {
  const client = getClient();
  const accounts = await client.getTokenCache().getAllAccounts();
  if (!accounts.length) return null;

  const account = cachedAccount ?? accounts[0];
  try {
    const result = await client.acquireTokenSilent({
      account,
      scopes: ONEDRIVE_SCOPES,
    });
    cachedAccount = result.account;
    return result;
  } catch {
    return null;
  }
}

async function acquireTokenByDeviceCode(
  onDeviceCode?: (info: OneDriveDeviceCodeInfo) => void,
): Promise<AuthenticationResult> {
  const client = getClient();
  const request: DeviceCodeRequest = {
    scopes: ONEDRIVE_SCOPES,
    timeout: 15 * 60,
    deviceCodeCallback: (response) => {
      onDeviceCode?.({
        message: response.message,
        userCode: response.userCode,
        verificationUri: response.verificationUri,
      });
    },
  };

  try {
    const result = await client.acquireTokenByDeviceCode(request);
    if (!result) {
      throw new Error('OneDrive 登录失败或已取消');
    }
    cachedAccount = result.account;
    return result;
  } catch (error) {
    throw new Error(formatAuthError(error));
  }
}

async function acquireToken(
  onDeviceCode?: (info: OneDriveDeviceCodeInfo) => void,
): Promise<AuthenticationResult> {
  const silent = await acquireTokenSilent();
  if (silent) return silent;

  return acquireTokenByDeviceCode(onDeviceCode);
}

async function graphFetch(
  path: string,
  init: RequestInit,
  onDeviceCode?: (info: OneDriveDeviceCodeInfo) => void,
): Promise<Response> {
  const token = await acquireToken(onDeviceCode);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token.accessToken}`);

  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    cachedAccount = null;
    const retryToken = await acquireToken(onDeviceCode);
    headers.set('Authorization', `Bearer ${retryToken.accessToken}`);
    return fetch(`${GRAPH_ROOT}${path}`, { ...init, headers });
  }

  return response;
}

async function downloadRemoteSnapshot(
  onDeviceCode?: (info: OneDriveDeviceCodeInfo) => void,
): Promise<UserDataSnapshot | null> {
  const response = await graphFetch(`${APP_ROOT_PATH}:/content`, {}, onDeviceCode);

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`读取 OneDrive 备份失败：${response.status} ${text}`);
  }

  const text = await response.text();
  return parseUserDataSnapshot(text);
}

async function uploadSnapshot(
  snapshot: UserDataSnapshot,
  onDeviceCode?: (info: OneDriveDeviceCodeInfo) => void,
): Promise<void> {
  const response = await graphFetch(
    `${APP_ROOT_PATH}:/content`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot, null, 2),
    },
    onDeviceCode,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`上传到 OneDrive 失败：${response.status} ${text}`);
  }
}

export function getOneDriveStatus(): OneDriveStatus {
  const meta = readOneDriveSyncMeta();
  const configured = isOneDriveConfigured();

  if (!configured) {
    return {
      configured: false,
      connected: false,
      accountName: null,
      lastSyncAt: meta.lastSyncAt,
      lastAction: meta.lastAction,
    };
  }

  try {
    const cachePath = getMsalCachePath();
    if (!fs.existsSync(cachePath)) {
      return {
        configured: true,
        connected: false,
        accountName: null,
        lastSyncAt: meta.lastSyncAt,
        lastAction: meta.lastAction,
      };
    }

    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as {
      Account?: Record<string, { username?: string; name?: string }>;
    };
    const accounts = Object.values(cache.Account ?? {});
    const account = accounts[0];

    return {
      configured: true,
      connected: accounts.length > 0,
      accountName: account?.name || account?.username || null,
      lastSyncAt: meta.lastSyncAt,
      lastAction: meta.lastAction,
    };
  } catch {
    return {
      configured: true,
      connected: false,
      accountName: null,
      lastSyncAt: meta.lastSyncAt,
      lastAction: meta.lastAction,
    };
  }
}

export async function loginOneDrive(
  onDeviceCode: (info: OneDriveDeviceCodeInfo) => void,
): Promise<{ accountName: string | null }> {
  if (!isOneDriveConfigured()) {
    throw new Error(
      'OneDrive 未配置。开发者需在 electron/onedrive.config.json 中填入客户端 ID。',
    );
  }

  // 全新登录：清掉旧缓存，避免残留 token 导致 invalid_grant
  await logoutOneDrive();

  const result = await acquireTokenByDeviceCode(onDeviceCode);
  return {
    accountName: result.account?.name || result.account?.username || null,
  };
}

export async function logoutOneDrive(): Promise<void> {
  const cachePath = getMsalCachePath();
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
  cachedAccount = null;
  pca = null;
}

export async function syncOneDrive(
  force?: 'upload' | 'download',
  onDeviceCode?: (info: OneDriveDeviceCodeInfo) => void,
): Promise<OneDriveSyncResult> {
  if (!isOneDriveConfigured()) {
    throw new Error('OneDrive 未配置');
  }

  const local = exportUserData();

  if (force === 'upload') {
    await uploadSnapshot(local, onDeviceCode);
    writeOneDriveSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastAction: 'upload',
    });
    return {
      action: 'upload',
      message: '已将本地数据上传到 OneDrive',
      meta: {
        updated_at: local.updated_at,
        device: local.device,
        inventoryCount: local.inventory.length,
        tradeOrderCount: local.trade_orders.length,
      },
    };
  }

  const remote = await downloadRemoteSnapshot(onDeviceCode);

  if (force === 'download') {
    if (!remote) {
      throw new Error('OneDrive 上还没有备份文件');
    }
    const meta = importUserData(remote);
    writeOneDriveSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastAction: 'download',
    });
    return {
      action: 'download',
      message: '已从 OneDrive 下载并覆盖本地数据',
      meta,
    };
  }

  const action = compareSnapshots(local, remote);

  if (action === 'none') {
    writeOneDriveSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastAction: 'none',
    });
    return { action: 'none', message: '本地与 OneDrive 数据已是最新' };
  }

  if (action === 'upload') {
    await uploadSnapshot(local, onDeviceCode);
    writeOneDriveSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastAction: 'upload',
    });
    return {
      action: 'upload',
      message: remote
        ? '本地数据较新，已上传到 OneDrive'
        : 'OneDrive 尚无备份，已上传本地数据',
      meta: {
        updated_at: local.updated_at,
        device: local.device,
        inventoryCount: local.inventory.length,
        tradeOrderCount: local.trade_orders.length,
      },
    };
  }

  const meta = importUserData(remote!);
  writeOneDriveSyncMeta({
    lastSyncAt: new Date().toISOString(),
    lastAction: 'download',
  });
  return {
    action: 'download',
    message: 'OneDrive 数据较新，已覆盖本地',
    meta,
  };
}

export async function peekRemoteOneDriveMeta(): Promise<{
  exists: boolean;
  updated_at: string | null;
  device: string | null;
}> {
  if (!isOneDriveConfigured()) {
    return { exists: false, updated_at: null, device: null };
  }

  try {
    const remote = await downloadRemoteSnapshot();
    if (!remote) {
      return { exists: false, updated_at: null, device: null };
    }
    return {
      exists: true,
      updated_at: remote.updated_at,
      device: remote.device,
    };
  } catch {
    return { exists: false, updated_at: null, device: null };
  }
}
