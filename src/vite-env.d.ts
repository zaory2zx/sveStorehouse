/// <reference types="vite/client" />

import type { SveApi } from '../electron/preload';

declare global {
  interface Window {
    sveApi: SveApi;
  }
}

export {};