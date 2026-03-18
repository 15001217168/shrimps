/// <reference types="vite-electron-plugin/electron-env" />

import { IpcRenderer } from 'electron'

/**
 * 全局共享配置接口
 */
export interface SharedConfig {
  /** OpenClaw Gateway 端口 */
  port: number
  /** OpenClaw Gateway 基础地址 */
  gatewayBaseUrl: string
}

declare global {
  // 扩展 NodeJS.Global 接口
  namespace NodeJS {
    interface Global {
      sharedConfig: SharedConfig
    }
  }

  interface Window {
    ipcRenderer: {
      on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): IpcRenderer
      off(channel: string, listener?: (...args: any[]) => void): IpcRenderer
      send(channel: string, ...args: any[]): void
      invoke(channel: string, ...args: any[]): Promise<any>
    }
  }
}

export {}

declare namespace NodeJS {
  interface ProcessEnv {
    VSCODE_DEBUG?: 'true'
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬ dist-electron
     * │ ├─┬ main
     * │ │ └── index.js    > Electron-Main
     * │ └─┬ preload
     * │   └── index.mjs   > Preload-Scripts
     * ├─┬ dist
     * │ └── index.html    > Electron-Renderer
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}
