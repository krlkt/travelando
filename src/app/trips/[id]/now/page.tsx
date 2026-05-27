import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { LiveView } from '@/components/live/LiveView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NowPage({ params }: PageProps) {
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
  return <LiveView tripId={id} />;
}
