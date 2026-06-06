'use client';

import { useState } from 'react';
import { Trash2, UserPlus, Crown, LogOut, Mail, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTrips } from '@/lib/trips/context';
import { useAuth } from '@/lib/auth/context';
import { memberHasFootprint } from '@/lib/trips/memberRetire';
import type { Trip, TripMember } from '@/lib/trips/types';

interface MembersSheetProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddMode = 'email' | 'name';

function initialsFor(member: TripMember): string {
  const source = member.displayName || member.email || '?';
  return source
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function MembersSheet({ trip, open, onOpenChange }: MembersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[420px]">
        {open && <MembersSheetBody trip={trip} onOpenChange={onOpenChange} />}
      </SheetContent>
    </Sheet>
  );
}

function MembersSheetBody({
  trip,
  onOpenChange,
}: {
  trip: Trip;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { addMember, removeMember, inviteMember, expenses, settlements } =
    useTrips();

  const isOwner = Boolean(user && trip.ownerId && trip.ownerId === user.id);

  const [mode, setMode] = useState<AddMode>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<TripMember | null>(null);

  // Per-row "invite by email" for an existing name-only member.
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  const friendlyError = (raw: string): string =>
    raw === 'user_not_found'
      ? "We couldn't find an account with that email."
      : raw.includes('unique') || raw.includes('duplicate')
        ? 'That person is already on this trip.'
        : raw;

  const handleAdd = async () => {
    if (mode === 'email' && !email.trim()) return;
    if (mode === 'name' && !name.trim()) return;

    setBusy(true);
    try {
      await addMember(trip.id, {
        email: mode === 'email' ? email.trim() : undefined,
        displayName: mode === 'name' ? name.trim() : undefined,
      });
      toast.success(
        mode === 'email'
          ? 'Invite sent — they can accept it from their dashboard'
          : 'Member added',
      );
      setEmail('');
      setName('');
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Add failed';
      toast.error(friendlyError(raw));
    } finally {
      setBusy(false);
    }
  };

  const startInvite = (member: TripMember) => {
    setInvitingId(member.id);
    setInviteEmail('');
  };

  const cancelInvite = () => {
    setInvitingId(null);
    setInviteEmail('');
  };

  const handleInvite = async (member: TripMember) => {
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    try {
      await inviteMember(trip.id, member.id, { email: inviteEmail.trim() });
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      cancelInvite();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Invite failed';
      toast.error(friendlyError(raw));
    } finally {
      setInviteBusy(false);
    }
  };

  const performRemove = async (member: TripMember) => {
    const isLeaving = Boolean(member.userId && user?.id === member.userId);
    setRemovingId(member.id);
    try {
      const result = await removeMember(trip.id, member.id);
      toast.success(
        result.retired
          ? `Kept ${member.displayName} as a name-only entry — their expenses stay on the trip`
          : isLeaving
            ? 'You left the trip'
            : 'Member removed',
      );
      if (isLeaving) onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Remove failed';
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  // A member with expense history can't be deleted without corrupting splits
  // and balances, so confirm that they'll be kept as a name-only entry first.
  // Pending invites and footprint-free members are removed instantly.
  const requestRemove = (member: TripMember) => {
    const hasHistory =
      member.status !== 'pending' &&
      memberHasFootprint(
        member.id,
        expenses[trip.id] ?? [],
        settlements[trip.id] ?? [],
      );
    if (hasHistory) {
      setPendingRemoval(member);
      return;
    }
    void performRemove(member);
  };

  const myMembership = user
    ? trip.members.find((m) => m.userId === user.id)
    : undefined;

  // The owner is mirrored into trip_members so they can participate in
  // expenses, but the owner row is rendered separately above — hide it
  // from the additional-members list to avoid showing them twice.
  const additionalMembers = trip.ownerId
    ? trip.members.filter((m) => m.userId !== trip.ownerId)
    : trip.members;

  return (
    <>
      <div>
        <SheetTitle>Trip members</SheetTitle>
        <SheetDescription>
          {isOwner
            ? 'Add people to plan together. Everyone you add can edit the trip.'
            : 'You can see everyone on this trip and leave at any time.'}
        </SheetDescription>
      </div>

      {isOwner && (
        <>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as AddMode)}
            className="gap-3"
          >
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1">
                Invite by email
              </TabsTrigger>
              <TabsTrigger value="name" className="flex-1">
                Add a name
              </TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="grid gap-2">
              <Label htmlFor="member-email">Email of an app user</Label>
              <div className="flex gap-2">
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email.trim() && !busy) handleAdd();
                  }}
                />
                <Button
                  onClick={handleAdd}
                  disabled={busy || !email.trim()}
                  size="icon"
                  aria-label="Add member"
                >
                  <UserPlus className="size-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                They&apos;ll get an invitation to accept or decline. No account
                yet? It waits for them and links when they sign up.
              </p>
            </TabsContent>
            <TabsContent value="name" className="grid gap-2">
              <Label htmlFor="member-name">Name only</Label>
              <div className="flex gap-2">
                <Input
                  id="member-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marta"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim() && !busy) handleAdd();
                  }}
                />
                <Button
                  onClick={handleAdd}
                  disabled={busy || !name.trim()}
                  size="icon"
                  aria-label="Add member"
                >
                  <UserPlus className="size-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                For people who don&apos;t use the app — just listed for now. You
                can invite them by email later to give them access.
              </p>
            </TabsContent>
          </Tabs>

          <Separator />
        </>
      )}

      <div className="grid gap-2">
        <Label className="text-muted-foreground text-xs tracking-wide uppercase">
          On this trip ({additionalMembers.length + 1})
        </Label>

        <div className="grid gap-1">
          <div className="flex items-center gap-3 rounded-[var(--radius)] px-2 py-2">
            <div className="bg-primary/10 text-primary grid size-9 place-items-center rounded-full text-sm font-medium">
              <Crown className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                Owner
                {user && trip.ownerId === user.id ? ' (you)' : ''}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                Manages members and can delete the trip
              </div>
            </div>
          </div>

          {additionalMembers.map((member) => {
            const isMe = Boolean(user && member.userId === user.id);
            const canRemove = isOwner || isMe;
            const isPending = member.status === 'pending';
            const isNameOnly = !member.userId && !isPending;
            const canInvite = isOwner && isNameOnly;
            const isInviting = invitingId === member.id;
            return (
              <div
                key={member.id}
                className="hover:bg-muted/50 rounded-[var(--radius)] px-2 py-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted text-foreground grid size-9 place-items-center overflow-hidden rounded-full text-sm font-medium">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initialsFor(member)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {member.displayName}
                        {isMe ? ' (you)' : ''}
                      </span>
                      {isPending && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] tracking-wide text-amber-600 uppercase dark:text-amber-400">
                          Invited
                        </span>
                      )}
                      {isNameOnly && (
                        <span className="text-muted-foreground rounded-full border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                          Name only
                        </span>
                      )}
                    </div>
                    {(member.invitedEmail ?? member.email) && (
                      <div className="text-muted-foreground truncate text-xs">
                        {member.invitedEmail ?? member.email}
                        {isPending ? ' · awaiting reply' : ''}
                      </div>
                    )}
                  </div>
                  {canInvite && !isInviting && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startInvite(member)}
                      aria-label={`Invite ${member.displayName} by email`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Mail className="size-4" />
                    </Button>
                  )}
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestRemove(member)}
                      disabled={removingId === member.id}
                      aria-label={
                        isMe
                          ? 'Leave trip'
                          : isPending
                            ? 'Cancel invite'
                            : 'Remove member'
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {isMe ? (
                        <LogOut className="size-4" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                </div>

                {isInviting && (
                  <div className="mt-2 flex gap-2 pl-12">
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={`Email for ${member.displayName}`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inviteEmail.trim())
                          handleInvite(member);
                        if (e.key === 'Escape') cancelInvite();
                      }}
                    />
                    <Button
                      onClick={() => handleInvite(member)}
                      disabled={inviteBusy || !inviteEmail.trim()}
                      size="icon"
                      aria-label="Send invite"
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelInvite}
                      aria-label="Cancel"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SheetFooter className="flex-col gap-2 sm:flex-row">
        {!isOwner && myMembership && (
          <Button
            variant="ghost"
            onClick={() => requestRemove(myMembership)}
            disabled={removingId === myMembership.id}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            Leave trip
          </Button>
        )}
        <SheetClose asChild>
          <Button variant="ghost" className="ml-auto">
            Done
          </Button>
        </SheetClose>
      </SheetFooter>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRemoval(null);
        }}
        title={
          pendingRemoval && user?.id === pendingRemoval.userId
            ? 'Leave this trip?'
            : 'Remove this member?'
        }
        description={
          pendingRemoval
            ? `${pendingRemoval.displayName} has expense history on this trip. They'll be kept as a name-only entry so the splits and balances stay intact, but they'll lose access to the trip.`
            : undefined
        }
        confirmLabel={
          pendingRemoval && user?.id === pendingRemoval.userId
            ? 'Leave trip'
            : 'Remove member'
        }
        destructive
        onConfirm={() => {
          const member = pendingRemoval;
          setPendingRemoval(null);
          if (member) void performRemove(member);
        }}
      />
    </>
  );
}
