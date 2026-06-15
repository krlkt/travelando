import type { ReactNode } from 'react';
import { TripBottomNav } from '@/components/shell/TripBottomNav';
import { TripDesktopNav } from '@/components/shell/TripDesktopNav';

export default function TripLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pb-24 md:pb-0">{children}</div>
      <TripBottomNav />
      <TripDesktopNav />
    </>
  );
}
