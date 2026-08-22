const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Config (LAN server URL) ────────────────────────────────────────────────
  getConfig: () => ipcRenderer.invoke('get-config'),

  // ── Print ──────────────────────────────────────────────────────────────────
  print:      (options) => ipcRenderer.invoke('print', options),
  printHtml:  (html)    => ipcRenderer.invoke('printHtml', html),
  printToPDF: (options) => ipcRenderer.invoke('printToPDF', options),

  // ── Zoom ───────────────────────────────────────────────────────────────────
  setZoom:   (factor) => ipcRenderer.invoke('zoom:set', factor),
  getZoom:   ()       => ipcRenderer.invoke('zoom:get'),
  zoomIn:    ()       => ipcRenderer.invoke('zoom:in'),
  zoomOut:   ()       => ipcRenderer.invoke('zoom:out'),
  resetZoom: ()       => ipcRenderer.invoke('zoom:reset'),

  // ── App info ───────────────────────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
  isElectron:    true,
  platform:      process.platform,

  // ── Main → renderer events ─────────────────────────────────────────────────

  /**
   * File › Print Receipt menu item was clicked.
   * Returns a cleanup function — use as the return value of useEffect.
   *
   * @example
   * useEffect(() => {
   *   if (!window.electronAPI) return;
   *   return window.electronAPI.onMenuPrint(() => handlePrint());
   * }, []);
   */
  onMenuPrint: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu:print', handler);
    return () => ipcRenderer.removeListener('menu:print', handler);
  },

  /**
   * Window was resized (debounced 100ms).
   * callback receives { width, height } in CSS pixels (content area).
   * Returns a cleanup function — use as the return value of useEffect.
   *
   * @example
   * useEffect(() => {
   *   if (!window.electronAPI) return;
   *   return window.electronAPI.onResize(({ width }) => {
   *     dispatch(setSidebarCollapsed(width < 1024));
   *   });
   * }, []);
   */
  onResize: (callback) => {
    const handler = (_event, dims) => callback(dims);
    ipcRenderer.on('window:resize', handler);
    return () => ipcRenderer.removeListener('window:resize', handler);
  },
});
