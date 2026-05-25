import type { Transition, Variants } from 'motion/react';

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const spring = {
  soft: {
    type: 'spring',
    stiffness: 220,
    damping: 26,
    mass: 0.8,
  } satisfies Transition,
  snappy: {
    type: 'spring',
    stiffness: 340,
    damping: 30,
    mass: 0.7,
  } satisfies Transition,
  gentle: {
    type: 'spring',
    stiffness: 120,
    damping: 20,
    mass: 1,
  } satisfies Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ease.out } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: ease.out } },
};

export const stagger = (
  delayChildren = 0,
  staggerChildren = 0.06,
): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring.soft },
};
