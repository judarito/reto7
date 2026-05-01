import { useCallback, useEffect, useRef, useState } from 'react';

export function usePendingAction(minDurationMs = 180) {
  const [isPending, setIsPending] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runPendingAction = useCallback(async (action: () => void | Promise<void>) => {
    if (isPending) return;

    setIsPending(true);
    const startedAt = Date.now();

    try {
      await new Promise<void>((resolve, reject) => {
        requestAnimationFrame(() => {
          Promise.resolve(action()).then(() => resolve()).catch(reject);
        });
      });
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minDurationMs - elapsed);

      if (!mountedRef.current) return;

      if (remaining > 0) {
        setTimeout(() => {
          if (mountedRef.current) {
            setIsPending(false);
          }
        }, remaining);
        return;
      }

      setIsPending(false);
    }
  }, [isPending, minDurationMs]);

  return { isPending, runPendingAction };
}
