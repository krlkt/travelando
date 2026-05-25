import { notFound } from 'next/navigation';
import { inMemoryRepository } from '@/lib/trips/inMemoryRepository';
import { LiveView } from '@/components/live/LiveView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NowPage({ params }: PageProps) {
  const { id } = await params;
  const trip = await inMemoryRepository.findById(id);
  if (!trip) notFound();
  return <LiveView tripId={id} />;
}
