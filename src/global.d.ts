// src/renderer/global.d.ts
export {} // 确保这是一个模块文件

import { ipcRenderer } from 'electron'

declare global {
  interface Window {
    /**
     * 与 Preload 脚本中 contextBridge.exposeInMainWorld('ipcRenderer', {...})
     * 完全匹配的全局 ipcRenderer 声明。
     */
    ipcRenderer: {
      /**
       * 通用监听 (Main -> Renderer)
       * 基于 ipcRenderer.on 的原生参数类型。
       */
      on(
        ...args: Parameters<typeof ipcRenderer.on>
      ): ReturnType<typeof ipcRenderer.on>

      /**
       * 通用单向发送 (Renderer -> Main)
       * 基于 ipcRenderer.send 的原生参数类型。
       */
      send(
        ...args: Parameters<typeof ipcRenderer.send>
      ): ReturnType<typeof ipcRenderer.send>

      /**
       * 通用双向调用 (Renderer <-> Main)
       * 基于 ipcRenderer.invoke 的原生参数类型。
       */
      invoke(
        ...args: Parameters<typeof ipcRenderer.invoke>
      ): ReturnType<typeof ipcRenderer.invoke>

      /**
       * 通用移除监听 (Renderer -> Renderer)
       * 基于 ipcRenderer.off 的原生参数类型。
       */
      off(
        ...args: Parameters<typeof ipcRenderer.off>
      ): ReturnType<typeof ipcRenderer.off>
    }
  }
}
