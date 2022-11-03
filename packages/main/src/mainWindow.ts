import { join } from "node:path"
import { URL } from "node:url"

import { BrowserWindow } from "electron"

async function createWindow() {
  const browserWindow = new BrowserWindow({
    width: 1280,
    height: 744,
    show: import.meta.env.DEV, // Use 'ready-to-show' event to show window when in production
    webPreferences: {
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(__dirname, "../../preload/dist/index.cjs"),
      contextIsolation: true,
      webSecurity: false,
    },
  })
  browserWindow.removeMenu()
  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * Do however use it in dev to make location.reload() work properly
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on("ready-to-show", () => {
    if (!import.meta.env.DEV) browserWindow?.show() // this repositions it and is annoying when in development

    browserWindow.webContents.openDevTools()

    if (import.meta.env.DEV) {
      // Lets just always open devtools for now
    }
  })

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test
   */
  const pageUrl =
    import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_URL
      : new URL("../renderer/dist/index.html", `file://${__dirname}`).toString()

  await browserWindow.loadURL(pageUrl)

  return browserWindow
}

/**
 * Restore existing BrowserWindow or Create new BrowserWindow
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(
    (rendererWindow) => !rendererWindow.isDestroyed()
  )
  if (window === undefined) {
    window = await createWindow()
  }
  if (window.isMinimized()) {
    window.restore()
  }
  window.focus()
}
