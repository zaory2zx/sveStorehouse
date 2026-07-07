import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SyncWarningBannerProps {
  syncing: boolean;
  onSync: () => void;
}

export function SyncWarningBanner({ syncing, onSync }: SyncWarningBannerProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <AlertTriangle size={18} className="shrink-0 text-amber-400" />
      <p className="min-w-0 flex-1 text-sm text-amber-100/90">
        简中卡库（SVE-helper）同步失败，稀有度等数据可能不完整。请点击「立即同步」或左侧「同步卡库」重试。
      </p>
      <button
        type="button"
        className="btn-secondary flex shrink-0 items-center gap-1.5 text-xs"
        onClick={onSync}
        disabled={syncing}
      >
        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
        {syncing ? '同步中…' : '立即同步'}
      </button>
    </div>
  );
}
