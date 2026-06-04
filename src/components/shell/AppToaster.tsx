'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

const TOAST_CLASSNAMES = {
  toast:
    'rounded-[var(--radius)] border border-border/70 bg-card text-card-foreground shadow-lg',
};

export function AppToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <Toaster
        position="bottom-center"
        offset={80}
        closeButton
        toastOptions={{ classNames: TOAST_CLASSNAMES }}
      />
    );
  }

  return (
    <Toaster
      position="top-center"
      toastOptions={{ classNames: TOAST_CLASSNAMES }}
    />
  );
}
