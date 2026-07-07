import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  addCart,
  addInventory,
  addToForSale,
  closeDatabase,
  createOrder,
  deleteOrder,
  getCardCount,
  getCardQuantities,
  getCardRares,
  getCardSets,
  getPersistedSyncError,
  getCart,
  getDatabase,
  getForSale,
  getInventory,
  getOrders,
  getStats,
  getTradeStats,
  markForSale,
  removeCart,
  removeInventory,
  countSearchCards,
  searchCards,
  sellFromForSale,
  setInventory,
  syncCardDatabase,
  unmarkForSale,
  type CardFilters,
  type CardVariant,
  type CartFilters,
  type CreateOrderInput,
  type ForSaleFilters,
  type InventoryFilters,
  type SellFromForSaleInput,
} from './db.js';
import { fetchImageAsDataUrl, copyImageFromDataUrl, saveImageFromDataUrl } from './exportImage.js';

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
  ipcMain.handle('db:getCardRares', () => getCardRares());
  ipcMain.handle('db:searchCards', (_e, filters: CardFilters) =>
    searchCards(filters),
  );
  ipcMain.handle('db:countSearchCards', (_e, filters: CardFilters) =>
    countSearchCards(filters),
  );
  ipcMain.handle('db:getInventory', (_e, filters: InventoryFilters) =>
    getInventory(filters),
  );
  ipcMain.handle('db:getCardQuantities', (_e, cardId: string) =>
    getCardQuantities(cardId),
  );
  ipcMain.handle(
    'db:addInventory',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      addInventory(cardId, variant, quantity),
  );
  ipcMain.handle(
    'db:addToForSale',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      addToForSale(cardId, variant, quantity),
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
  ipcMain.handle('db:getForSale', (_e, filters: ForSaleFilters) =>
    getForSale(filters),
  );
  ipcMain.handle(
    'db:markForSale',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      markForSale(cardId, variant, quantity),
  );
  ipcMain.handle(
    'db:unmarkForSale',
    (_e, cardId: string, variant: CardVariant, quantity: number) =>
      unmarkForSale(cardId, variant, quantity),
  );
  ipcMain.handle('db:sellFromForSale', (_e, input: SellFromForSaleInput) =>
    sellFromForSale(input),
  );
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
  ipcMain.handle('db:getOrders', (_e, limit?: number, offset?: number) =>
    getOrders(limit, offset),
  );
  ipcMain.handle('db:createOrder', (_e, input: CreateOrderInput) =>
    createOrder(input),
  );
  ipcMain.handle(
    'db:deleteOrder',
    (_e, id: number, revertInventory?: boolean) =>
      deleteOrder(id, revertInventory ?? false),
  );
  ipcMain.handle('export:fetchImage', (_e, url: string) =>
    fetchImageAsDataUrl(url),
  );
  ipcMain.handle('export:saveImage', (_e, dataUrl: string, defaultName: string) =>
    saveImageFromDataUrl(dataUrl, defaultName),
  );
  ipcMain.handle('export:copyImage', (_e, dataUrl: string) => {
    copyImageFromDataUrl(dataUrl);
  });
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

