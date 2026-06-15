'use client';

import { useSyncExternalStore } from 'react';
import { Toaster } from 'sonner';

const TOAST_CLASSNAMES = {
  toast:
    'rounded-[var(--radius)] border border-border/70 bg-card text-card-foreground shadow-lg',
};

const MOBILE_QUERY = '(max-width: 767px)';

function subscribeToMobile(callback: () => void): () => void {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getMobileSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// The server can't measure the viewport; assume desktop and let the client
// reconcile on hydration.
function getMobileServerSnapshot(): boolean {
  return false;
}

export function AppToaster() {
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );

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
