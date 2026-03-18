/**
 * Electron IPC Renderer 类型声明
 */

interface IPCRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void
  off(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void
  send(channel: string, ...args: unknown[]): void
}

declare global {
  interface Window {
    ipcRenderer: IPCRenderer
  }
}

export {}
