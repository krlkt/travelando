'use client';

import { motion } from 'motion/react';
import { CalendarDays, Map, Radio, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fadeUp, stagger } from '@/lib/motion/presets';

interface Feature {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  copy: string;
  tone: string;
}

const features: Feature[] = [
  {
    icon: CalendarDays,
    eyebrow: 'Day by day',
    title: 'A trip that holds itself together',
    copy: 'Dates, hours, transport, lodging, activities, meals, notes — all bound to the day, in the order you actually move through it.',
    tone: 'oklch(64% 0.16 38)',
  },
  {
    icon: Map,
    eyebrow: 'See your timeline',
    title: 'A calm view of everything ahead',
    copy: 'Zoom out to the whole trip or in on one day. Move things around without losing the shape of your plan.',
    tone: 'oklch(72% 0.12 220)',
  },
  {
    icon: Radio,
    eyebrow: 'Live mode',
    title: 'Quietly tells you what is next',
    copy: 'Open Now & Next while traveling and you get exactly two things: what you are doing right now and what comes after.',
    tone: 'oklch(60% 0.13 295)',
  },
  {
    icon: Wallet,
    eyebrow: 'Expenses',
    title: 'Track spend without ceremony',
    copy: 'Add a number to any item. See running totals per day and per category, in whatever currencies you brought along.',
    tone: 'oklch(70% 0.15 75)',
  },
];

export function FeatureBento() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[var(--container-page)]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger(0, 0.08)}
          className="grid gap-4 lg:grid-cols-12"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl leading-tight tracking-tight md:text-5xl lg:col-span-5"
          >
            Four moves.
            <br />
            <span className="text-primary italic">
              That&apos;s the whole product.
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground text-lg leading-relaxed lg:col-span-6 lg:col-start-7 lg:mt-3"
          >
            No social feed. No AI agent making decisions for you. Just a
            thoughtful place to put the things that make a trip work, and the
            smallest possible nudge while it&apos;s happening.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger(0.05, 0.1)}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f, i) => (
            <FeatureTile key={f.eyebrow} feature={f} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureTile({ feature, index }: { feature: Feature; index: number }) {
  const { icon: Icon, eyebrow, title, copy, tone } = feature;
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`group border-border/70 bg-card relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border p-6 ${
        index === 0 ? 'sm:col-span-2 lg:col-span-2 lg:row-span-1' : ''
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: tone }}
      />
      <span
        className="text-background grid size-11 place-items-center rounded-2xl"
        style={{ background: tone }}
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <div className="text-muted-foreground mt-6 text-[10px] tracking-[0.18em] uppercase">
        {eyebrow}
      </div>
      <h3 className="font-display mt-2 text-2xl leading-tight tracking-tight">
        {title}
      </h3>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        {copy}
      </p>
    </motion.article>
  );
}
