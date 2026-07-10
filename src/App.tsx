import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DataSyncModal } from './components/DataSyncModal';
import { SyncWarningBanner } from './components/SyncWarningBanner';
import { Page } from './lib/constants';
import { AddCardPage } from './pages/AddCardPage';
import { CartPage } from './pages/CartPage';
import { ForSalePage } from './pages/ForSalePage';
import { InventoryPage } from './pages/InventoryPage';
import { StatsPage } from './pages/StatsPage';
import { TradesPage } from './pages/TradesPage';

const SYNC_WARNING_KEY = 'sve-card-sync-warning';

export default function App() {
  const [page, setPage] = useState<Page>('inventory');
  const [cardCount, setCardCount] = useState(0);
  const [cardSets, setCardSets] = useState<string[]>([]);
  const [cardRares, setCardRares] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [initState, setInitState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [initMessage, setInitMessage] = useState('正在初始化…');
  const [syncing, setSyncing] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [dataSyncOpen, setDataSyncOpen] = useState(false);

  const refreshMeta = useCallback(async () => {
    const [count, sets, rares] = await Promise.all([
      window.sveApi.getCardCount(),
      window.sveApi.getCardSets(),
      window.sveApi.getCardRares(),
    ]);
    setCardCount(count);
    setCardSets(sets);
    setCardRares(rares);
  }, []);

  const bump = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const markSyncFailed = useCallback(() => {
    localStorage.setItem(SYNC_WARNING_KEY, '1');
    setSyncWarning(true);
  }, []);

  const clearSyncWarning = useCallback(() => {
    localStorage.removeItem(SYNC_WARNING_KEY);
    setSyncWarning(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setInitMessage('正在加载卡库，首次启动可能需要下载…');
        const result = await window.sveApi.init();
        if (result.cached) {
          setInitMessage(`卡库已就绪（${result.total} 张）`);
        } else if (result.syncError) {
          setInitMessage(
            `卡库已部分同步（${result.total} 张）；部分数据失败，请点「同步卡库」重试`,
          );
        } else {
          setInitMessage(`卡库已同步（${result.total} 张）`);
        }
        await refreshMeta();
        if (result.syncError) {
          markSyncFailed();
        } else if (!result.cached && !result.syncError) {
          clearSyncWarning();
        } else if (localStorage.getItem(SYNC_WARNING_KEY)) {
          setSyncWarning(true);
        }
        setInitState('ready');
      } catch (e) {
        setInitMessage(
          e instanceof Error ? e.message : '初始化失败，请检查网络连接',
        );
        setInitState('error');
      }
    })();
  }, [refreshMeta, markSyncFailed, clearSyncWarning]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.sveApi.syncCards();
      await refreshMeta();
      bump();
      if (result.syncError) {
        markSyncFailed();
        alert(
          `卡库已更新（${result.total} 张）\n简中卡库同步仍失败，稀有度等数据可能不完整。`,
        );
      } else {
        clearSyncWarning();
        alert(`卡库已更新（${result.total} 张）`);
      }
    } catch (e) {
      markSyncFailed();
      alert(e instanceof Error ? e.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  if (initState === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-sve-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-sve-gold border-t-transparent" />
        <p className="text-sve-muted">{initMessage}</p>
      </div>
    );
  }

  if (initState === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-sve-bg p-8 text-center">
        <p className="text-red-400">{initMessage}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-sve-bg">
      <Sidebar
        page={page}
        onNavigate={setPage}
        cardCount={cardCount}
        onSync={handleSync}
        syncing={syncing}
        onOpenDataSync={() => setDataSyncOpen(true)}
      />

      <DataSyncModal
        open={dataSyncOpen}
        onClose={() => setDataSyncOpen(false)}
        onChanged={bump}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {syncWarning && (
          <SyncWarningBanner syncing={syncing} onSync={handleSync} />
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          {page === 'inventory' && (
            <InventoryPage
              cardSets={cardSets}
              cardRares={cardRares}
              refreshKey={refreshKey}
              onChanged={bump}
            />
          )}
          {page === 'forSale' && (
            <ForSalePage
              cardSets={cardSets}
              cardRares={cardRares}
              refreshKey={refreshKey}
              onChanged={bump}
            />
          )}
          {page === 'add' && (
            <AddCardPage
              cardSets={cardSets}
              cardRares={cardRares}
              onAdded={bump}
            />
          )}
          {page === 'cart' && (
            <CartPage
              cardSets={cardSets}
              cardRares={cardRares}
              refreshKey={refreshKey}
              onChanged={bump}
            />
          )}
          {page === 'trades' && (
            <TradesPage refreshKey={refreshKey} onChanged={bump} />
          )}
          {page === 'stats' && <StatsPage refreshKey={refreshKey} />}
        </div>
      </main>
    </div>
  );
}
