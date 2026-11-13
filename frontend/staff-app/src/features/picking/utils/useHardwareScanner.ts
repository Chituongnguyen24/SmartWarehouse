import { useEffect, useRef } from 'react';

export interface HardwareScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxKeyIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Hook to listen for hardware PDA barcode gun scans (Zebra DataWedge, Honeywell, CipherLab)
 * These devices emulate keyboard typing at ultra-high speed (< 35ms per keystroke) terminated with 'Enter'.
 */
export const useHardwareScanner = ({
  onScan,
  minChars = 3,
  maxKeyIntervalMs = 45,
  enabled = true,
}: HardwareScannerOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is actively typing in a form text input/textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Reset buffer if key interval is too long (manual human typing is > 80ms)
      if (timeDiff > maxKeyIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const scanned = bufferRef.current.trim();
        if (scanned.length >= minChars) {
          e.preventDefault();
          e.stopPropagation();
          onScan(scanned);
        }
        bufferRef.current = '';
        return;
      }

      // Append printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onScan, minChars, maxKeyIntervalMs, enabled]);
};
