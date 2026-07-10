import { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  Download,
  HardDrive,
  LogOut,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { Modal } from './Modal';

interface DataSyncModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '从未';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN');
}

export function DataSyncModal({
  open,
  onClose,
  onChanged,
}: DataSyncModalProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deviceCode, setDeviceCode] = useState<{
    userCode: string;
    verificationUri: string;
    message: string;
  } | null>(null);
  const [oneDriveStatus, setOneDriveStatus] =
    useState<Awaited<ReturnType<typeof window.sveApi.getOneDriveStatus>> | null>(
      null,
    );

  const refreshStatus = useCallback(async () => {
    const status = await window.sveApi.getOneDriveStatus();
    setOneDriveStatus(status);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setDeviceCode(null);
    void refreshStatus();
  }, [open, refreshStatus]);

  useEffect(() => {
    if (!open) return;
    return window.sveApi.onOneDriveDeviceCode((info) => {
      setDeviceCode(info);
    });
  }, [open]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () =>
    run(async () => {
      const result = await window.sveApi.exportUserData();
      if (!result.saved) return;
      setMessage(
        `已导出到：${result.filePath}\n库存 ${result.meta?.inventoryCount ?? 0} 项，交易 ${result.meta?.tradeOrderCount ?? 0} 笔`,
      );
    });

  const handleImport = () =>
    run(async () => {
      const confirmed = window.confirm(
        '导入将覆盖当前库存、购物车、待售和交易记录，是否继续？',
      );
      if (!confirmed) return;

      const result = await window.sveApi.importUserData();
      if (!result.imported) return;

      onChanged();
      setMessage(
        `已从文件导入：${result.filePath}\n库存 ${result.meta?.inventoryCount ?? 0} 项，交易 ${result.meta?.tradeOrderCount ?? 0} 笔`,
      );
    });

  const handleOneDriveLogin = () =>
    run(async () => {
      setDeviceCode(null);
      const result = await window.sveApi.loginOneDrive();
      setDeviceCode(null);
      await refreshStatus();
      setMessage(result.accountName
        ? `已连接 OneDrive：${result.accountName}`
        : '已连接 OneDrive');
    });

  const handleOneDriveLogout = () =>
    run(async () => {
      await window.sveApi.logoutOneDrive();
      await refreshStatus();
      setMessage('已断开 OneDrive 连接');
    });

  const handleOneDriveSync = () =>
    run(async () => {
      const result = await window.sveApi.syncOneDrive();
      if (result.action === 'download') onChanged();
      await refreshStatus();
      setMessage(result.message);
    });

  const handleForceUpload = () =>
    run(async () => {
      const confirmed = window.confirm(
        '将用本地数据覆盖 OneDrive 上的备份，是否继续？',
      );
      if (!confirmed) return;
      const result = await window.sveApi.syncOneDrive('upload');
      await refreshStatus();
      setMessage(result.message);
    });

  const handleForceDownload = () =>
    run(async () => {
      const confirmed = window.confirm(
        '将从 OneDrive 下载数据并覆盖本地，是否继续？',
      );
      if (!confirmed) return;
      const result = await window.sveApi.syncOneDrive('download');
      onChanged();
      await refreshStatus();
      setMessage(result.message);
    });

  const oneDriveAvailable = oneDriveStatus?.configured ?? false;

  return (
    <Modal open={open} onClose={onClose} title="库存备份" width="max-w-xl">
      <div className="space-y-5">
        <p className="text-sm text-sve-muted">
          此处同步的是你的<strong className="text-sve-text">库存、购物车、交易记录</strong>
          ，与侧边栏「同步卡库」（更新卡牌数据库）无关。不登录 OneDrive 也能正常使用。
        </p>

        <section className="rounded-lg border border-sve-border bg-sve-bg/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sve-text">
            <HardDrive size={16} className="text-sve-gold" />
            离线备份
          </div>
          <p className="mb-3 text-xs text-sve-muted">
            导出文件后可通过 U 盘、微信等方式带到另一台电脑导入，无需任何云账号。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary flex items-center gap-2 text-xs"
              onClick={handleExport}
              disabled={busy}
            >
              <Download size={14} />
              导出到文件
            </button>
            <button
              type="button"
              className="btn-secondary flex items-center gap-2 text-xs"
              onClick={handleImport}
              disabled={busy}
            >
              <Upload size={14} />
              从文件导入
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-sve-border bg-sve-bg/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sve-text">
            <Cloud size={16} className="text-sve-gold" />
            OneDrive 云同步
            <span className="badge bg-sve-card text-sve-muted">可选</span>
          </div>

          {!oneDriveAvailable ? (
            <div className="space-y-2 text-xs text-sve-muted">
              <p>OneDrive 尚未配置，云同步不可用（离线备份不受影响）。</p>
              <p>
                请复制{' '}
                <code className="text-sve-text">electron/onedrive.config.example.json</code>{' '}
                为{' '}
                <code className="text-sve-text">electron/onedrive.config.json</code>
                ，填入 Azure 注册的客户端 ID，然后重启应用。
              </p>
              <p className="text-[11px]">
                注意：只改 example 文件无效，必须创建独立的 config 文件。
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 space-y-1 text-xs text-sve-muted">
                <p>
                  状态：
                  {oneDriveStatus?.connected
                    ? `已连接（${oneDriveStatus.accountName ?? 'Microsoft 账号'}）`
                    : '未连接'}
                </p>
                <p>上次同步：{formatTime(oneDriveStatus?.lastSyncAt ?? null)}</p>
              </div>

              {deviceCode && (
                <div className="mb-3 rounded-lg border border-sve-gold/30 bg-sve-gold/10 p-3 text-xs text-sve-text">
                  <p className="mb-2">请在浏览器打开下方链接并输入验证码：</p>
                  <p className="mb-1 break-all">
                    <a
                      href={deviceCode.verificationUri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sve-gold underline"
                    >
                      {deviceCode.verificationUri}
                    </a>
                  </p>
                  <p className="font-mono text-base text-sve-gold">
                    {deviceCode.userCode}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!oneDriveStatus?.connected ? (
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-2 text-xs"
                    onClick={handleOneDriveLogin}
                    disabled={busy}
                  >
                    <Cloud size={14} />
                    连接 OneDrive
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-primary flex items-center gap-2 text-xs"
                      onClick={handleOneDriveSync}
                      disabled={busy}
                    >
                      <RefreshCw
                        size={14}
                        className={busy ? 'animate-spin' : ''}
                      />
                      智能同步
                    </button>
                    <button
                      type="button"
                      className="btn-secondary flex items-center gap-2 text-xs"
                      onClick={handleForceUpload}
                      disabled={busy}
                    >
                      <Upload size={14} />
                      上传覆盖
                    </button>
                    <button
                      type="button"
                      className="btn-secondary flex items-center gap-2 text-xs"
                      onClick={handleForceDownload}
                      disabled={busy}
                    >
                      <Download size={14} />
                      下载覆盖
                    </button>
                    <button
                      type="button"
                      className="btn-secondary flex items-center gap-2 text-xs"
                      onClick={handleOneDriveLogout}
                      disabled={busy}
                    >
                      <LogOut size={14} />
                      断开
                    </button>
                  </>
                )}
              </div>
              <p className="mt-3 text-xs text-sve-muted">
                「智能同步」会比较时间戳：本地较新则上传，网盘较新则下载。公司/家里交替使用时，一般点这一项即可。
              </p>
            </>
          )}
        </section>

        {message && (
          <p className="whitespace-pre-wrap rounded-lg border border-sve-border bg-sve-card px-3 py-2 text-xs text-sve-text">
            {message}
          </p>
        )}
      </div>
    </Modal>
  );
}
