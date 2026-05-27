import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { MobileTopBar } from './MobileTopBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNav />
      <MobileTopBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
