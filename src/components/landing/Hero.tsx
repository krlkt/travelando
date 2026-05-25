'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeUp, stagger } from '@/lib/motion/presets';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-28 sm:pt-28 md:px-10 lg:pt-36 lg:pb-40">
      <BackgroundFlourish />

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger(0.05, 0.12)}
        className="relative mx-auto max-w-[var(--container-page)]"
      >
        <motion.div
          variants={fadeUp}
          className="border-border/70 bg-background/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm"
        >
          <Sparkles className="text-primary size-3.5" />A calmer way to plan
          your trips
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display mt-6 max-w-4xl text-[clamp(2.75rem,1rem+7vw,6.5rem)] leading-[1.02] tracking-[-0.02em]"
        >
          Plan trips you&apos;ll actually{' '}
          <span className="text-primary italic">live</span>,
          <br className="hidden md:block" />
          one quiet day at a time.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-muted-foreground mt-7 max-w-xl text-lg leading-relaxed"
        >
          Travelando holds your days, hours, transport, activities, notes and
          expenses in one unhurried place — then quietly tells you where to be
          next while you&apos;re traveling.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Button asChild size="lg">
            <Link href="/trips">
              Plan a trip
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/trips/trip-lisbon">See a demo trip</Link>
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-16 lg:mt-24">
          <HeroPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}

function BackgroundFlourish() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 size-[640px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(72% 0.13 38 / 0.5) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 size-[520px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(72% 0.12 220 / 0.45) 0%, transparent 70%)',
        }}
      />
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />
    </>
  );
}

function HeroPreview() {
  return (
    <div className="border-border/70 bg-card/70 relative rounded-[var(--radius-xl)] border p-2 shadow-[0_40px_80px_-32px_oklch(20%_0.02_250_/_0.25)] backdrop-blur-sm">
      <div className="bg-background/70 grid gap-3 rounded-[calc(var(--radius-xl)_-_0.5rem)] p-4 sm:grid-cols-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:col-span-2">
          <PreviewTile
            label="Now"
            title="Tram 28 + Alfama walk"
            sub="10:00 → 13:00 · Lisbon"
            accent="oklch(64% 0.16 38)"
          />
          <PreviewTile
            label="Next"
            title="Lunch — Time Out Market"
            sub="13:30 · 10 min walk"
            accent="oklch(70% 0.15 75)"
          />
        </div>
        <div className="border-border/60 bg-card flex flex-col gap-2 rounded-[var(--radius-lg)] border p-4 sm:col-span-3">
          <div className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            Day 2 · Saturday
          </div>
          <PreviewRow
            time="09:15"
            title="Train to Sintra"
            tone="oklch(72% 0.12 220)"
          />
          <PreviewRow
            time="10:30"
            title="Pena Palace"
            tone="oklch(64% 0.16 38)"
          />
          <PreviewRow
            time="13:00"
            title="Quinta da Regaleira"
            tone="oklch(64% 0.16 38)"
          />
          <PreviewRow
            time="20:00"
            title="Dinner — Time Out"
            tone="oklch(70% 0.15 75)"
          />
          <PreviewRow
            time="22:30"
            title="Casa do Príncipe"
            tone="oklch(60% 0.13 295)"
            muted
          />
        </div>
      </div>
    </div>
  );
}

function PreviewTile({
  label,
  title,
  sub,
  accent,
}: {
  label: string;
  title: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="border-border/60 bg-card relative overflow-hidden rounded-[var(--radius-lg)] border p-4">
      <div
        className="absolute top-0 left-0 h-full w-1"
        style={{ background: accent }}
      />
      <div className="pl-2">
        <div className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          {label}
        </div>
        <div className="mt-1 leading-tight font-medium">{title}</div>
        <div className="text-muted-foreground mt-1 text-xs">{sub}</div>
      </div>
    </div>
  );
}

function PreviewRow({
  time,
  title,
  tone,
  muted,
}: {
  time: string;
  title: string;
  tone: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-1.5 ${muted ? 'opacity-60' : ''}`}
    >
      <span className="text-muted-foreground w-12 text-xs tabular-nums">
        {time}
      </span>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: tone }}
      />
      <span className="text-sm leading-tight">{title}</span>
    </div>
  );
}
