import { contextBridge, ipcRenderer } from 'electron';
import type {
  CardFilters,
  CardRow,
  CardVariant,
  CartFilters,
  CartRow,
  CreateTradeInput,
  InventoryFilters,
  InventoryRow,
  StatsSummary,
  SyncResult,
  TradeRow,
} from './db.js';

export interface SveApi {
  init: () => Promise<SyncResult>;
  syncCards: () => Promise<SyncResult>;
  getCardCount: () => Promise<number>;
  getCardSets: () => Promise<string[]>;
  searchCards: (filters: CardFilters) => Promise<CardRow[]>;
  getInventory: (filters: InventoryFilters) => Promise<InventoryRow[]>;
  addInventory: (
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
  getTrades: (limit?: number, offset?: number) => Promise<TradeRow[]>;
  createTrade: (input: CreateTradeInput) => Promise<TradeRow>;
  deleteTrade: (id: number, revertInventory?: boolean) => Promise<void>;
}

const api: SveApi = {
  init: () => ipcRenderer.invoke('db:init'),
  syncCards: () => ipcRenderer.invoke('db:syncCards'),
  getCardCount: () => ipcRenderer.invoke('db:getCardCount'),
  getCardSets: () => ipcRenderer.invoke('db:getCardSets'),
  searchCards: (filters) => ipcRenderer.invoke('db:searchCards', filters),
  getInventory: (filters) => ipcRenderer.invoke('db:getInventory', filters),
  addInventory: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:addInventory', cardId, variant, quantity),
  removeInventory: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:removeInventory', cardId, variant, quantity),
  setInventory: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:setInventory', cardId, variant, quantity),
  getCart: (filters) => ipcRenderer.invoke('db:getCart', filters),
  addCart: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:addCart', cardId, variant, quantity),
  removeCart: (cardId, variant, quantity) =>
    ipcRenderer.invoke('db:removeCart', cardId, variant, quantity),
  getStats: () => ipcRenderer.invoke('db:getStats'),
  getTradeStats: () => ipcRenderer.invoke('db:getTradeStats'),
  getTrades: (limit, offset) =>
    ipcRenderer.invoke('db:getTrades', limit, offset),
  createTrade: (input) => ipcRenderer.invoke('db:createTrade', input),
  deleteTrade: (id, revertInventory) =>
    ipcRenderer.invoke('db:deleteTrade', id, revertInventory),
};

contextBridge.exposeInMainWorld('sveApi', api);

export type { CardRow, InventoryRow, CartRow, TradeRow, CardVariant, CreateTradeInput };
