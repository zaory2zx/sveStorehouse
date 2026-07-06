import {
  BarChart3,
  Package,
  PlusCircle,
  RefreshCw,
  ScrollText,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { Page } from '../lib/constants';

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  cardCount: number;
  onSync: () => void;
  syncing: boolean;
}

const NAV: { id: Page; label: string; icon: typeof Package }[] = [
  { id: 'inventory', label: '我的库存', icon: Package },
  { id: 'forSale', label: '待售', icon: Tag },
  { id: 'add', label: '添加卡牌', icon: PlusCircle },
  { id: 'cart', label: '购物车', icon: ShoppingCart },
  { id: 'trades', label: '交易记录', icon: ScrollText },
  { id: 'stats', label: '库存统计', icon: BarChart3 },
];

export function Sidebar({
  page,
  onNavigate,
  cardCount,
  onSync,
  syncing,
}: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sve-border bg-gradient-to-b from-[#12151c] to-sve-surface">
      <div className="relative border-b border-sve-border px-5 py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sve-gold/60 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#2a2418] via-[#1a1710] to-sve-bg text-xl font-black text-sve-gold shadow-glow ring-1 ring-sve-gold/30">
            S
            <span className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-sve-gold/40 blur-sm" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-[#f0d875] to-sve-gold bg-clip-text text-base font-bold tracking-wide text-transparent">
              SVE 小仓库
            </h1>
            <p className="text-[11px] tracking-widest text-sve-muted">SHADOWVERSE EVOLVE</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              page === id
                ? 'bg-sve-gold/15 text-sve-gold shadow-glow'
                : 'text-sve-muted hover:bg-sve-card hover:text-sve-text'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-sve-border p-4">
        <p className="mb-2 text-xs text-sve-muted">
          卡库：{cardCount.toLocaleString()} 张
        </p>
        <button
          type="button"
          className="btn-secondary flex w-full items-center justify-center gap-2 text-xs"
          onClick={onSync}
          disabled={syncing}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? '同步中…' : '同步卡库'}
        </button>
      </div>
    </aside>
  );
}
