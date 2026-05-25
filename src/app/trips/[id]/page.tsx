import { notFound } from 'next/navigation';
import { inMemoryRepository } from '@/lib/trips/inMemoryRepository';
import { TripDetail } from '@/components/trips/TripDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: PageProps) {
  const { id } = await params;
  const trip = await inMemoryRepository.findById(id);
  if (!trip) notFound();
  return <TripDetail tripId={id} />;
}
