import { type Variants } from "framer-motion";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export const sectionProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "-80px" },
} as const;

export const itemProps = {
  variants: fadeInUp,
  transition: { duration: 0.5, ease: "easeOut" },
} as const;
