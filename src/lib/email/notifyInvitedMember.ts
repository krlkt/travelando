import type { User } from '@supabase/supabase-js';
import type { TripsRepository } from '@/lib/trips/repository';
import type { TripMember } from '@/lib/trips/types';
import { sendTripInvite } from './sendTripInvite';

// The inviter's display name for the email body, mirroring the auth user
// mapping: prefer their profile name, fall back to the email's local part.
function ownerDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    '';
  if (name) return name;
  return user.email?.split('@')[0] || 'A friend';
}

// Sends the invitation email for a freshly created/converted pending member.
// Email is a best-effort side effect: the invite is already persisted and
// surfaces on the invitee's dashboard, so a send failure is logged, never
// thrown. Returns whether the email went out.
export async function notifyInvitedMember(
  repo: TripsRepository,
  tripId: string,
  member: TripMember,
  user: User,
): Promise<boolean> {
  if (member.status !== 'pending' || !member.invitedEmail) return false;

  const trip = await repo.findById(tripId);
  const result = await sendTripInvite({
    invitedEmail: member.invitedEmail,
    tripTitle: trip?.title ?? 'a trip',
    ownerName: ownerDisplayName(user),
  });

  if (!result.ok) {
    console.error(
      `[invite-email] failed to send to ${member.invitedEmail}: ${result.error}`,
    );
  }

  return result.ok;
}
