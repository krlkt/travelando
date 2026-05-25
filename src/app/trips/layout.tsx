import type { ReactNode } from 'react';
import { inMemoryRepository } from '@/lib/trips/inMemoryRepository';
import { TripsBootstrap } from '@/components/shell/TripsBootstrap';

export default async function TripsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const trips = await inMemoryRepository.findAll();
  return <TripsBootstrap trips={trips}>{children}</TripsBootstrap>;
}
