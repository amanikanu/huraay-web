import { motion, useReducedMotion } from "motion/react";

const colors = ["#6223cf", "#ee3a84", "#ffffff", "#9b72e8", "#f58ab7"];
const pieces = Array.from({ length: 28 }, (_, i) => {
  const a = ((i * 73 + 19) % 101) / 101;
  const b = ((i * 47 + 31) % 97) / 97;
  const c = ((i * 61 + 7) % 89) / 89;
  const d = ((i * 37 + 13) % 83) / 83;
  return {
    id: i,
    x: (i % 2 ? 1 : -1) * (30 + a * 210),
    y: 90 + b * 260,
    r: c * 260,
    c: colors[i % colors.length],
    d: d * 0.24,
  };
});
export function CelebrationBurst({ active = false }: { active?: boolean }) {
  const reduce = useReducedMotion();
  if (!active || reduce) return null;
  return (
    <div className="celebration-burst" aria-hidden="true">
      {pieces.map((p) => (
        <motion.i
          key={p.id}
          style={{ background: p.c }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: p.x,
            y: p.y,
            rotate: p.r,
            scale: [0, 1, 1],
          }}
          transition={{ duration: 1.45, delay: p.d, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
export function FloatingCelebration() {
  const reduce = useReducedMotion();
  return (
    <div className="floating-celebration" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.span
          key={i}
          animate={reduce ? undefined : { y: [0, -12, 0], rotate: [-2, 3, -2] }}
          transition={{
            duration: 4 + i * 0.45,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.25,
          }}
          style={{ "--i": i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
export function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.strong
      initial={reduce ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 14 }}
    >
      {to}
    </motion.strong>
  );
}
