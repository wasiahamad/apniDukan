import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const INTRO_STORAGE_KEY = "publicdukan:introSeen";

export default function LogoIntro() {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;

    try {
      const seen = sessionStorage.getItem(INTRO_STORAGE_KEY);
      if (seen === "1") return;
      sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // If storage is blocked, still show once.
    }

    setShow(true);
    const timeout = window.setTimeout(() => setShow(false), 2300);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  if (!show) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[100] grid place-items-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className={
          "absolute inset-0 " +
          "bg-[radial-gradient(55%_55%_at_50%_35%,hsl(var(--primary)/0.20),transparent_60%)," +
          "radial-gradient(55%_55%_at_60%_55%,hsl(var(--secondary)/0.18),transparent_62%)]"
        }
      />

      <motion.div
        className="relative flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <motion.img
          src="/logo-removebg-preview.png"
          alt=""
          className="h-24 w-24 object-contain"
          initial={{ rotate: -2 }}
          animate={{ rotate: 2 }}
          transition={{ duration: 0.9, repeat: 1, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div
          className="mt-3 text-lg font-bold tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.25 }}
        >
          <span className="text-foreground">Public</span>
          <span className="text-primary">Dukan</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
