import { ReactNode, useEffect, useState } from 'react';
import { CraftIcon } from '../components/CraftIcon';
import {
  CLASS_LABELS,
  displayRare,
  formatMoney,
  sortRareValues,
  StatsSummary,
} from '../lib/constants';

interface StatsPageProps {
  refreshKey: number;
}

export function StatsPage({ refreshKey }: StatsPageProps) {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [tradeStats, setTradeStats] = useState({
    totalBuy: 0,
    totalSell: 0,
    netSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, t] = await Promise.all([
          window.sveApi.getStats(),
          window.sveApi.getTradeStats(),
        ]);
        if (!cancelled) {
          setStats(s);
          setTradeStats(t);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading || !stats) {
    return (
      <div className="flex h-full items-center justify-center text-sve-muted">
        加载统计中…
      </div>
    );
  }

  const maxClass = Math.max(...stats.byClass.map((c) => c.count), 1);
  const maxSet = Math.max(...stats.bySet.map((s) => s.count), 1);

  return (
    <div className="h-full overflow-auto p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-sve-text">库存统计</h2>
        <p className="mt-1 text-sm text-sve-muted">库存概览与交易金额汇总</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="卡牌总数" value={stats.totalCards.toLocaleString()} />
        <StatCard label="不重复卡种" value={stats.uniqueCards.toLocaleString()} />
        <StatCard label="累计买入" value={formatMoney(tradeStats.totalBuy)} />
        <StatCard
          label="净支出"
          value={formatMoney(tradeStats.netSpent)}
          highlight
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-sve-gold">
            按职业分布
          </h3>
          {stats.byClass.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="space-y-3">
              {stats.byClass.map((item) => (
                <BarRow
                  key={item.class}
                  label={CLASS_LABELS[item.class] ?? item.class}
                  count={item.count}
                  max={maxClass}
                  icon={<CraftIcon className={item.class} size={18} />}
                />
              ))}
            </div>
          )}
        </section>

        <section className="panel p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-sve-gold">
            按系列分布
          </h3>
          {stats.bySet.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="space-y-3">
              {stats.bySet.slice(0, 12).map((item) => (
                <BarRow
                  key={item.card_set}
                  label={item.card_set}
                  count={item.count}
                  max={maxSet}
                />
              ))}
            </div>
          )}
        </section>

        <section className="panel p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-sve-gold">
            按稀有度分布
          </h3>
          {stats.byRare.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="flex flex-wrap gap-4">
              {sortRareValues(stats.byRare.map((item) => item.rare)).map((rare) => {
                const item = stats.byRare.find((r) => r.rare === rare)!;
                return (
                  <div
                    key={item.rare || '__empty'}
                    className="rounded-xl border border-sve-border bg-sve-bg px-5 py-4 text-center"
                  >
                    <p className="text-2xl font-bold text-sve-gold">{item.count}</p>
                    <p className="mt-1 text-sm text-sve-muted">{displayRare(item.rare)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-sve-gold">
            交易金额
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-sve-bg p-4">
              <p className="text-xl font-bold text-green-400">
                {formatMoney(tradeStats.totalBuy)}
              </p>
              <p className="mt-1 text-xs text-sve-muted">买入总额</p>
            </div>
            <div className="rounded-lg bg-sve-bg p-4">
              <p className="text-xl font-bold text-red-400">
                {formatMoney(tradeStats.totalSell)}
              </p>
              <p className="mt-1 text-xs text-sve-muted">卖出总额</p>
            </div>
            <div className="rounded-lg bg-sve-bg p-4">
              <p className="text-xl font-bold text-sve-gold">
                {formatMoney(tradeStats.netSpent)}
              </p>
              <p className="mt-1 text-xs text-sve-muted">净支出</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`panel p-5 ${highlight ? 'border-sve-gold/30 shadow-glow' : ''}`}
    >
      <p className="text-xs uppercase tracking-wider text-sve-muted">{label}</p>
      <p
        className={`mt-2 text-3xl font-bold ${highlight ? 'text-sve-gold' : 'text-sve-text'}`}
      >
        {value}
      </p>
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  icon,
}: {
  label: string;
  count: number;
  max: number;
  icon?: ReactNode;
}) {
  const pct = Math.round((count / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span className="text-sve-muted">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sve-bg">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sve-gold/80 to-sve-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyHint() {
  return <p className="text-sm text-sve-muted">暂无数据</p>;
}
