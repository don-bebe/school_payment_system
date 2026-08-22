import {
  app,
  BrowserWindow,
  session,
  ipcMain,
  Menu,
  shell,
  screen,
} from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import process from "process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// ── Suppress EBADF on console writes when stdout/stderr are closed ────────────
// When the app is launched without a terminal (e.g. from a desktop shortcut),
// Node's stdout/stderr file descriptors are invalid. Any console.log/error call
// then crashes the main process with EBADF. Swallow those errors silently.
['stdout', 'stderr'].forEach(stream => {
  process[stream]?.on?.('error', (err) => {
    if (err?.code === 'EBADF' || err?.code === 'EPIPE') return; // expected when no terminal
    // re-throw unexpected errors
  });
});

// ── App icon ──────────────────────────────────────────────────────────────────
const iconPath = (() => {
  const candidates = [
    path.join(__dirname, "../public/logo.png"),   // dev
    path.join(__dirname, "../dist/logo.png"),      // production build
    path.join(process.resourcesPath ?? "", "app/public/logo.png"), // packaged
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
})();

// ── Linux crash fixes ─────────────────────────────────────────────────────────
// Must be called before app.whenReady() — Chromium processes these flags
// before argv is parsed, so CLI flags alone (--no-sandbox) are not reliable.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}

// ── Window-state persistence ──────────────────────────────────────────────────
// Stored in Electron's userData folder (e.g. AppData/Roaming/school-fees-app)
const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");
const DEFAULT_STATE = { width: 1280, height: 800, x: undefined, y: undefined, isMaximized: false };

function loadWindowState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const saved = JSON.parse(raw);

    // Validate the saved bounds are still on a connected display
    const displays = screen.getAllDisplays();
    const onScreen = displays.some((d) => {
      const b = d.bounds;
      return (
        saved.x >= b.x &&
        saved.y >= b.y &&
        saved.x + saved.width <= b.x + b.width &&
        saved.y + saved.height <= b.y + b.height
      );
    });

    return onScreen ? saved : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveWindowState(win) {
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? {} : win.getBounds();
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ ...DEFAULT_STATE, ...bounds, isMaximized }),
      "utf-8"
    );
  } catch {
    // non-fatal — worst case the window resets to defaults next launch
  }
}

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Print Receipt",
          accelerator: "CmdOrCtrl+P",
          click: () => win.webContents.send("menu:print"),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Logs Folder",
          click: () => shell.openPath(app.getPath("logs")),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

// Print
ipcMain.handle("print", (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return Promise.reject(new Error("No window found"));
  return new Promise((resolve, reject) => {
    win.webContents.print({ silent: false, printBackground: true, ...options }, (ok, err) => {
      ok ? resolve(true) : reject(new Error(err || "Print failed"));
    });
  });
});

// Print arbitrary HTML in a hidden popup window (used by receipts and other
// Print arbitrary HTML in the main window via a hidden iframe.
// This avoids creating a new BrowserWindow (which fails to enumerate printers
// on Linux/X11). Instead we inject an invisible iframe into the existing window,
// which already has its printer list populated, print from it, then clean up.
ipcMain.handle("printHtml", async (event, html) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return Promise.reject(new Error("No window found"));

  // Escape backticks and template-literal special chars so the string is safe
  // to embed inside a JS template literal in executeJavaScript.
  const safe = html
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  try {
    await win.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        try {
          const iframe = document.createElement('iframe');
          iframe.style.cssText =
            'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
          iframe.srcdoc = \`${safe}\`;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
              // Give the print dialog time to open before removing the iframe
              setTimeout(() => {
                try { document.body.removeChild(iframe); } catch {}
                resolve(true);
              }, 500);
            } catch (e) {
              try { document.body.removeChild(iframe); } catch {}
              reject(new Error('iframe print failed: ' + e.message));
            }
          };
          iframe.onerror = (e) => {
            try { document.body.removeChild(iframe); } catch {}
            reject(new Error('iframe load failed'));
          };
        } catch(e) {
          reject(new Error('iframe inject failed: ' + e.message));
        }
      })
    `);
    return true;
  } catch (err) {
    throw new Error(err?.message ?? 'Print failed');
  }
});

// Print to PDF
ipcMain.handle("printToPDF", (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return Promise.reject(new Error("No window found"));
  return win.webContents.printToPDF({ printBackground: true, pageSize: "A4", ...options });
});

// ── Config — LAN server URL ───────────────────────────────────────────────────
// Reads config.json from userData folder. If missing, writes a default pointing
// to localhost so Computer 1 (server) works out of the box.
// On Computer 2/3 change apiUrl in:
//   %APPDATA%\school-fees-app\config.json
const DEFAULT_CONFIG = { apiUrl: "http://localhost:5221" };

function ensureConfig() {
  const userDataPath = app.getPath("userData");
  const configPath   = path.join(userDataPath, "config.json");
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  if (!fs.existsSync(configPath)) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    } catch (err) {
      console.error("[config] Failed to write default config.json:", err);
    }
  }
  return configPath;
}

function readConfig() {
  const configPath = ensureConfig();
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

ipcMain.handle("get-config", () => readConfig());

// ── CSP ───────────────────────────────────────────────────────────────────────
// Built dynamically so connect-src always matches the apiUrl in config.json.
// No hardcoded IPs — works on any client PC after editing config.json.
function buildCSP() {
  const config = readConfig();
  const apiUrl = config.apiUrl.replace(/\/$/, ""); // strip trailing slash

  const connectSrc = [
    "'self'",
    "http://localhost:5221",
    "http://localhost:5000",
    apiUrl,
  ]
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .join(" ");

  // 'unsafe-eval' is required by Vite's dev HMR runtime but not in production.
  // Omitting it in production removes the Electron security warning.
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: blob:",
    "media-src 'self'",
  ].join("; ");
}

// ── Zoom controls ─────────────────────────────────────────────────────────────
// Renderer usage (via preload):
//   window.electronAPI.setZoom(1.25)
//   window.electronAPI.getZoom()   → Promise<number>
//   window.electronAPI.zoomIn()    → Promise<number>  (new factor)
//   window.electronAPI.zoomOut()   → Promise<number>
//   window.electronAPI.resetZoom() → Promise<1>
const ZOOM_MIN  = 0.6;
const ZOOM_MAX  = 2.0;
const ZOOM_STEP = 0.1;

ipcMain.handle("zoom:set", (event, factor) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, factor));
  win.webContents.setZoomFactor(clamped);
  return clamped;
});

ipcMain.handle("zoom:get", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.webContents.getZoomFactor() : 1;
});

ipcMain.handle("zoom:reset", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return 1;
  win.webContents.setZoomFactor(1);
  return 1;
});

ipcMain.handle("zoom:in", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const next = Math.min(
    ZOOM_MAX,
    parseFloat((win.webContents.getZoomFactor() + ZOOM_STEP).toFixed(2))
  );
  win.webContents.setZoomFactor(next);
  return next;
});

ipcMain.handle("zoom:out", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const next = Math.max(
    ZOOM_MIN,
    parseFloat((win.webContents.getZoomFactor() - ZOOM_STEP).toFixed(2))
  );
  win.webContents.setZoomFactor(next);
  return next;
});

// ── Window resize → notify renderer ──────────────────────────────────────────
// Renderer listens via: window.electronAPI.onResize(({ width, height }) => { … })
// Useful for collapsing sidebar when the window gets narrow, etc.
function attachResizeNotifier(win) {
  let timer;
  win.on("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (win.isDestroyed()) return;
      const [width, height] = win.getContentSize();
      win.webContents.send("window:resize", { width, height });
    }, 100); // debounce — don't spam the renderer on every pixel drag
  });
}

// ── Window factory ────────────────────────────────────────────────────────────
function createWindow() {
  const state = loadWindowState();

  // Auto-scale initial zoom on high-DPI displays (e.g. 4K → scaleFactor 2)
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor    = primaryDisplay.scaleFactor ?? 1;
  const initialZoom    = scaleFactor >= 2 ? 1.25 : 1.0;

  const win = new BrowserWindow({
    width:    state.width,
    height:   state.height,
    x:        state.x,
    y:        state.y,
    minWidth:  960,
    minHeight: 600,
    show: false,                   // reveal only after ready-to-show
    icon:     iconPath,            // custom app icon
    titleBarStyle: "default",
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,     // needed for preload
      preload:          path.join(__dirname, "preload.cjs"),
      zoomFactor:       initialZoom,
    },
  });

  // Restore maximised state after creation
  if (state.isMaximized) win.maximize();

  // ── CSP on every response ────────────────────────────────────────────────
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [buildCSP()],
      },
    });
  });

  // ── Graceful reveal ──────────────────────────────────────────────────────
  win.once("ready-to-show", () => win.show());

  // ── Persist window state on close ───────────────────────────────────────
  win.on("close", () => saveWindowState(win));

  // ── Notify renderer on resize ────────────────────────────────────────────
  attachResizeNotifier(win);

  // ── Load app ─────────────────────────────────────────────────────────────
  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), { hash: "/" });
  }

  buildMenu(win);

  // Block popup windows — send to default browser instead
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  ensureConfig();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});