import type { ReactNode } from 'react';
import { TripBottomNav } from '@/components/shell/TripBottomNav';

export default function TripLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pb-24 md:pb-0">{children}</div>
      <TripBottomNav />
    </>
  );
}
