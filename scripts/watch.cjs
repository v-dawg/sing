#!/usr/bin/env node
/* eslint-disable no-multi-assign */
/* eslint-disable unicorn/prefer-top-level-await */

const { spawn } = require("node:child_process")

const { createServer, build, createLogger } = require("vite")
const electronPath = require("electron")

/** @type 'production' | 'development'' */
const mode = (process.env.MODE = process.env.MODE || "development")

/** @type {import('vite').LogLevel} */
const logLevel = "info"

/** Messages on stderr that match any of the contained patterns will be stripped from output */
const stderrFilterPatterns = [
  /**
   * warning about devtools extension
   * @see https://github.com/cawa-93/vite-electron-builder/issues/492
   * @see https://github.com/MarshallOfSound/electron-devtools-installer/issues/143
   */
  /ExtensionLoadWarning/,
]

/** @type {ChildProcessWithoutundefinedStreams | undefined} */
let spawnProcess
let isFirstInit = true
/**
 * Setup watcher for `main` package
 * On file changed it totally re-launch electron app.
 * @param {import('vite').ViteDevServer} watchServer Renderer watch server instance.
 * Needs to set up `VITE_DEV_SERVER_URL` environment variable from {@link import('vite').ViteDevServer.resolvedUrls}
 */
function setupMainPackageWatcher({ resolvedUrls }) {
  // eslint-disable-next-line prefer-destructuring
  process.env.VITE_DEV_SERVER_URL = resolvedUrls.local[0]

  const logger = createLogger(logLevel, {
    prefix: "[main and backend]\n",
  })

  return build({
    mode,
    logLevel,
    build: {
      /**
       * Set to {} to enable rollup watcher
       * @see https://vitejs.dev/config/build-options.html#build-watch
       */
      watch: {},
    },
    configFile: "packages/main/vite.config.js",
    plugins: [
      {
        name: "reload-app-on-main-package-change",
        writeBundle() {
          /** Kill electron ff process already exist */
          if (spawnProcess !== undefined) {
            spawnProcess.off("exit", process.exit)
            spawnProcess.kill("SIGINT")
            spawnProcess = undefined
          }

          /** Spawn new electron process */
          spawnProcess = spawn(String(electronPath), ["."])

          /** Proxy all logs */
          spawnProcess.stdout.on(
            "data",
            (d) =>
              d.toString().trim() &&
              logger.warn(d.toString(), { timestamp: true })
          )

          /** Proxy error logs but stripe some noisy messages. See {@link stderrFilterPatterns} */
          spawnProcess.stderr.on("data", (d) => {
            const data = d.toString().trim()
            if (!data) return
            const mayIgnore = stderrFilterPatterns.some((r) => r.test(data))
            if (mayIgnore) return
            logger.error(data, { timestamp: true })
          })

          /** Stops the watch script when the application has been quit */
          spawnProcess.on("exit", process.exit)
        },
      },
    ],
  })
}

/**
 * Setup watcher for `backend` package
 * On file changed it totally re-launch electron app.
 * @param {import('vite').ViteDevServer} watchServer Renderer watch server instance.
 * Needs to set up `VITE_DEV_SERVER_URL` environment variable from {@link import('vite').ViteDevServer.resolvedUrls}
 */
function setupBackendPackageWatcher({ resolvedUrls }) {
  // eslint-disable-next-line prefer-destructuring
  process.env.VITE_DEV_SERVER_URL = resolvedUrls.local[0]

  const logger = createLogger(logLevel, {
    prefix: "[main and backend]\n",
  })

  return build({
    mode,
    logLevel,
    build: {
      /**
       * Set to {} to enable rollup watcher
       * @see https://vitejs.dev/config/build-options.html#build-watch
       */
      watch: {},
    },
    configFile: "packages/backend/vite.config.js",
    plugins: [
      {
        name: "reload-app-on-main-package-change",
        writeBundle() {
          if (isFirstInit === true) {
            isFirstInit = false
            return
          }
          /** Kill electron if process already exist */
          if (spawnProcess !== undefined) {
            spawnProcess.off("exit", process.exit)
            spawnProcess.kill("SIGINT")
            spawnProcess = undefined
          }

          /** Spawn new electron process */
          spawnProcess = spawn(String(electronPath), ["."])

          /** Proxy all logs */
          spawnProcess.stdout.on(
            "data",
            (d) =>
              d.toString().trim() &&
              logger.warn(d.toString(), { timestamp: true })
          )

          /** Proxy error logs but stripe some noisy messages. See {@link stderrFilterPatterns} */
          spawnProcess.stderr.on("data", (d) => {
            const data = d.toString().trim()
            if (!data) return
            const mayIgnore = stderrFilterPatterns.some((r) => r.test(data))
            if (mayIgnore) return
            logger.error(data, { timestamp: true })
          })

          /** Stops the watch script when the application has been quit */
          spawnProcess.on("exit", process.exit)
        },
      },
    ],
  })
}

/**
 * Setup watcher for `preload` package
 * On file changed it reload web page.
 * @param {import('vite').ViteDevServer} watchServer Renderer watch server instance.
 * Required to access the web socket of the page. By sending the `full-reload` command to the socket, it reloads the web page.
 */
function setupPreloadPackageWatcher({ ws }) {
  return build({
    mode,
    logLevel,
    build: {
      /**
       * Set to {} to enable rollup watcher
       * @see https://vitejs.dev/config/build-options.html#build-watch
       */
      watch: {},
    },
    configFile: "packages/preload/vite.config.js",
    plugins: [
      {
        name: "reload-page-on-preload-package-change",
        writeBundle() {
          ws.send({
            type: "full-reload",
          })
        },
      },
    ],
  })
}

;(async () => {
  try {
    /**
     * Renderer watcher
     * This must be the first,
     * because the {@link setupMainPackageWatcher} and {@link setupPreloadPackageWatcher} depend on the renderer params
     */
    const rendererWatchServer = await createServer({
      mode,
      logLevel,
      configFile: "packages/renderer/vite.config.js",
    })

    /**
     * Should launch watch server before create other watchers
     */
    await rendererWatchServer.listen()

    /**
     * See {@link setupPreloadPackageWatcher} JSDoc
     */
    await setupPreloadPackageWatcher(rendererWatchServer)

    /**
     * See {@link setupBackendPackageWatcher} JSDoc
     */
    await setupBackendPackageWatcher(rendererWatchServer)

    /**
     * See {@link setupMainPackageWatcher} JSDoc
     */
    await setupMainPackageWatcher(rendererWatchServer)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
})()