import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { TripDetail } from '@/components/trips/TripDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createSupabaseRepository(supabase);

  let trip = null;
  try {
    trip = await repo.findById(id);
  } catch (err) {
    console.error(`[travelando] trip ${id} findById failed`, err);
  }

  if (!trip) notFound();
  return <TripDetail tripId={id} />;
}
