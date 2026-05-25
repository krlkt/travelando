'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeUp, stagger } from '@/lib/motion/presets';

const steps = [
  {
    n: '01',
    title: 'Add the bones',
    copy: 'Title, destination, dates. Five seconds, no fields you do not need.',
  },
  {
    n: '02',
    title: 'Drop in what matters',
    copy: 'Flights, hotels, the dinner you booked, the museum you might. Time-aware, day-aware.',
  },
  {
    n: '03',
    title: 'Stay quietly oriented',
    copy: 'Open Now & Next on the move. The rest of the plan stays out of your way.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-secondary/40 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[var(--container-page)]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger(0, 0.1)}
          className="grid gap-12 lg:grid-cols-12"
        >
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <div className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
              How it works
            </div>
            <h2 className="font-display mt-3 text-4xl leading-tight tracking-tight md:text-5xl">
              From idea to{' '}
              <em className="text-primary decoration-primary/30 not-italic underline decoration-2 underline-offset-[6px]">
                on the train
              </em>{' '}
              in under a minute.
            </h2>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/trips">
                  Plan a trip
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.ol
            variants={stagger(0.05, 0.1)}
            className="grid gap-6 lg:col-span-8 lg:grid-cols-3"
          >
            {steps.map((s) => (
              <motion.li
                key={s.n}
                variants={fadeUp}
                className="border-border/70 bg-background rounded-[var(--radius-xl)] border p-6"
              >
                <div className="font-display text-primary text-5xl leading-none tracking-tight">
                  {s.n}
                </div>
                <div className="mt-5 font-medium">{s.title}</div>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {s.copy}
                </p>
              </motion.li>
            ))}
          </motion.ol>
        </motion.div>
      </div>
    </section>
  );
}
