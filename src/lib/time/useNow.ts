'use client';

import { useEffect, useState } from 'react';

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Re-sample immediately on mount. The initial state is taken during render,
    // which on the server is the server's UTC clock; this swaps in the device's
    // own clock right after hydration so floating wall-times are compared in the
    // viewer's timezone instead of waiting up to a full interval.
    tick();
    const id = window.setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs]);

  return now;
}
