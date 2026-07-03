import { contextBridge, ipcRenderer } from 'electron';
import type {
  CardFilters,
  CardRow,
  CardVariant,
  CartFilters,
  CartRow,
  CreateOrderInput,
  ForSaleFilters,
  ForSaleRow,
  InventoryFilters,
  InventoryRow,
  SellFromForSaleInput,
  StatsSummary,
  SyncResult,
  TradeOrderRow,
} from './db.js';

export interface SveApi {
  init: () => Promise<SyncResult>;
  syncCards: () => Promise<SyncResult>;
  getCardCount: () => Promise<number>;
  getCardSets: () => Promise<string[]>;
  searchCards: (filters: CardFilters) => Promise<CardRow[]>;
  countSearchCards: (filters: CardFilters) => Promise<number>;
  getInventory: (filters: InventoryFilters) => Promise<InventoryRow[]>;
  addInventory: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  addToForSale: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  removeInventory: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  setInventory: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  getCart: (filters: CartFilters) => Promise<CartRow[]>;
  getForSale: (filters: ForSaleFilters) => Promise<ForSaleRow[]>;
  markForSale: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  unmarkForSale: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  sellFromForSale: (input: SellFromForSaleInput) => Promise<TradeOrderRow>;
  addCart: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  removeCart: (
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ) => Promise<number>;
  getStats: () => Promise<StatsSummary>;
  getTradeStats: () => Promise<{
    totalBuy: number;
    totalSell: number;
    netSpent: number;
  }>;
  getOrders: (limit?: number, offset?: number) => Promise<TradeOrderRow[]>;
  createOrder: (input: CreateOrderInput) => Promise<TradeOrderRow>;
  deleteOrder: (id: number, revertInventory?: boolean) => Promise<void>;
  fetchImageDataUrl: (url: string) => Promise<string>;
  saveImage: (
    dataUrl: string,
    defaultName: string,
  ) => Promise<{ saved: boolean; filePath?: string }>;
}

const api: SveApi = {
  init: () => ipcRenderer.invoke('db:init'),
  syncCards: () => ipcRenderer.invoke('db:syncCards'),
  getCardCount: () => ipcRenderer.invoke('db:getCardCount'),
  getCardSets: () => ipcRenderer.invoke('db:getCardSets'),
  searchCards: (filters) => ipcRenderer.invoke('db:searchCards', filters),
  countSearchCards: (filters) =>
    ipcRenderer.invoke('db:countSearchCards', filters),
  getInventory: (filters) => ipcRenderer.invoke('db:getInventory', filters),
  addInventory: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:addInventory', cardId, variant, quantity),
  addToForSale: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:addToForSale', cardId, variant, quantity),
  removeInventory: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:removeInventory', cardId, variant, quantity),
  setInventory: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:setInventory', cardId, variant, quantity),
  getCart: (filters) => ipcRenderer.invoke('db:getCart', filters),
  getForSale: (filters) => ipcRenderer.invoke('db:getForSale', filters),
  markForSale: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:markForSale', cardId, variant, quantity),
  unmarkForSale: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:unmarkForSale', cardId, variant, quantity),
  sellFromForSale: (input) =>
    ipcRenderer.invoke('db:sellFromForSale', input),
  addCart: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:addCart', cardId, variant, quantity),
  removeCart: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:removeCart', cardId, variant, quantity),
  getStats: () => ipcRenderer.invoke('db:getStats'),
  getTradeStats: () => ipcRenderer.invoke('db:getTradeStats'),
  getOrders: (limit, offset) =>
    ipcRenderer.invoke('db:getOrders', limit, offset),
  createOrder: (input) => ipcRenderer.invoke('db:createOrder', input),
  deleteOrder: (id, revertInventory) =>
    ipcRenderer.invoke('db:deleteOrder', id, revertInventory),
  fetchImageDataUrl: (url) => ipcRenderer.invoke('export:fetchImage', url),
  saveImage: (dataUrl, defaultName) =>
    ipcRenderer.invoke('export:saveImage', dataUrl, defaultName),
};

contextBridge.exposeInMainWorld('sveApi', api);

export type {
  CardRow,
  InventoryRow,
  CartRow,
  ForSaleRow,
  TradeOrderRow,
  CardVariant,
  CreateOrderInput,
  SellFromForSaleInput,
};
