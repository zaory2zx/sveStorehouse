import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  addCart,
  addInventory,
  closeDatabase,
  createTrade,
  deleteTrade,
  getCardCount,
  getCardSets,
  getCart,
  getDatabase,
  getInventory,
  getStats,
  getTradeStats,
  getTrades,
  removeCart,
  removeInventory,
  searchCards,
  setInventory,
  syncCardDatabase,
  type CardFilters,
  type CardVariant,
  type CartFilters,
  type CreateTradeInput,
  type InventoryFilters,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0d0f14',
    title: 'SVE 小仓库',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('db:init', async () => {
    getDatabase();
    const count = getCardCount();

    if (count === 0) {
      return syncCardDatabase();
    }
    return { count, total: count, cached: true };
  });

  ipcMain.handle('db:syncCards', () => syncCardDatabase());
  ipcMain.handle('db:getCardCount', () => getCardCount());
  ipcMain.handle('db:getCardSets', () => getCardSets());
  ipcMain.handle('db:searchCards', (_e, filters: CardFilters) =>
    searchCards(filters),
  );
  ipcMain.handle('db:getInventory', (_e, filters: InventoryFilters) =>
    getInventory(filters),
  );
  ipcMain.handle(
    'db:addInventory',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      addInventory(cardId, variant, quantity),
  );
  ipcMain.handle(
    'db:removeInventory',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      removeInventory(cardId, variant, quantity),
  );
  ipcMain.handle(
    'db:setInventory',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      setInventory(cardId, variant, quantity),
  );
  ipcMain.handle('db:getCart', (_e, filters: CartFilters) => getCart(filters));
  ipcMain.handle(
    'db:addCart',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      addCart(cardId, variant, quantity),
  );
  ipcMain.handle(
    'db:removeCart',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      removeCart(cardId, variant, quantity),
  );
  ipcMain.handle('db:getStats', () => getStats());
  ipcMain.handle('db:getTradeStats', () => getTradeStats());
  ipcMain.handle('db:getTrades', (_e, limit?: number, offset?: number) =>
    getTrades(limit, offset),
  );
  ipcMain.handle('db:createTrade', (_e, input: CreateTradeInput) =>
    createTrade(input),
  );
  ipcMain.handle(
    'db:deleteTrade',
    (_e, id: number, revertInventory?: boolean) =>
      deleteTrade(id, revertInventory ?? false),
  );
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});
