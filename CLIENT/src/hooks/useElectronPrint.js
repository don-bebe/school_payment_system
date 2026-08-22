import { useState, useCallback, useEffect } from 'react';

export default function useElectronPrint({ onMenuPrint } = {}) {
  const [printing, setPrinting] = useState(false);

  // Listen for File › Print Receipt from the Electron menu
  useEffect(() => {
    if (!window.electronAPI?.onMenuPrint || !onMenuPrint) return;
    // onMenuPrint returns a cleanup function
    return window.electronAPI.onMenuPrint(onMenuPrint);
  }, [onMenuPrint]);

  const print = useCallback(async (options = {}) => {
    setPrinting(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.print) {
        // Electron path — uses IPC → main.js → webContents.print()
        await window.electronAPI.print(options);
      } else {
        // Browser / Vite dev server fallback
        window.print();
      }
    } catch (err) {
      console.error('[useElectronPrint]', err);
    } finally {
      setPrinting(false);
    }
  }, []);

  return { print, printing };
}