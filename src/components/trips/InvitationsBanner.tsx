'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTrips } from '@/lib/trips/context';
import { formatDateRange } from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { TripInvitation } from '@/lib/trips/types';

export function InvitationsBanner() {
  const { invitations, acceptInvitation, declineInvitation } = useTrips();

  if (invitations.length === 0) return null;

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={stagger(0, 0.07)}
      aria-labelledby="invitations-heading"
      className="mt-12"
    >
      <motion.div variants={fadeUp} className="flex items-baseline gap-3">
        <h2
          id="invitations-heading"
          className="font-display text-2xl leading-tight tracking-tight"
        >
          You&apos;re invited
        </h2>
        <span className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          {invitations.length} pending
        </span>
      </motion.div>

      <motion.ul
        variants={stagger(0.05, 0.07)}
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        {invitations.map((invite) => (
          <motion.li key={invite.memberId} variants={fadeUp}>
            <InvitationCard
              invite={invite}
              onAccept={acceptInvitation}
              onDecline={declineInvitation}
            />
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}

interface InvitationCardProps {
  invite: TripInvitation;
  onAccept: (memberId: string) => Promise<void>;
  onDecline: (memberId: string) => Promise<void>;
}

function InvitationCard({ invite, onAccept, onDecline }: InvitationCardProps) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const handle = async (action: 'accept' | 'decline') => {
    setBusy(action);
    try {
      if (action === 'accept') {
        await onAccept(invite.memberId);
        toast.success(`You joined ${invite.tripTitle}`);
      } else {
        await onDecline(invite.memberId);
        toast.success('Invitation declined');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error(
        message === 'invitation_not_found'
          ? 'This invitation is no longer available.'
          : message,
      );
      setBusy(null);
    }
  };

  return (
    <div className="border-border/70 bg-card relative overflow-hidden rounded-[var(--radius-xl)] border">
      {/* Owner's cover gradient as a thin atmospheric edge, not a flat fill. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: invite.coverGradient }}
      />
      <div className="p-4 pt-5">
        <div className="font-display text-lg leading-tight tracking-tight">
          {invite.tripTitle}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{invite.tripDestination}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          {formatDateRange(invite.startDate, invite.endDate)}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Invited by{' '}
          <span className="text-foreground font-medium">
            {invite.ownerName}
          </span>
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => handle('accept')}
            disabled={busy !== null}
            size="sm"
            className="flex-1"
          >
            <Check className="size-4" />
            {busy === 'accept' ? 'Joining…' : 'Accept'}
          </Button>
          <Button
            onClick={() => handle('decline')}
            disabled={busy !== null}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
