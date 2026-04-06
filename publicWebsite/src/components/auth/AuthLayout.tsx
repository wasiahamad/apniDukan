import { motion } from "framer-motion";
import { Sparkles, Store } from "lucide-react";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_10%_0%,rgba(30,190,118,0.18),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(255,136,0,0.2),transparent_30%),linear-gradient(180deg,#f8fafc,#ffffff)] py-4 md:py-8">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="order-2 md:order-1 hidden md:flex rounded-3xl border border-white/40 bg-white/30 backdrop-blur-xl shadow-[0_20px_45px_rgba(15,23,42,0.12)] p-8 flex-col justify-between overflow-hidden relative"
          >
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[rgb(30,190,118)]/25 blur-3xl" />
            <div className="absolute -left-20 -bottom-16 h-48 w-48 rounded-full bg-[rgb(255,136,0)]/25 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[rgb(30,190,118)]/20 text-[rgb(30,190,118)] flex items-center justify-center">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">
                    Dukaan<span className="text-[rgb(30,190,118)]">Direct</span>
                  </p>
                  <p className="text-sm text-slate-600">Discover local shops faster</p>
                </div>
              </div>

              <h2 className="mt-10 text-4xl font-black leading-tight text-slate-900">
                Local shopping, now with a premium mobile app vibe.
              </h2>
              <p className="mt-4 text-slate-600 max-w-md">
                Sign in to manage bookings, live location, nearby shops, and your active plan.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-8">
              <div className="rounded-2xl bg-white/70 border border-white/60 p-4 shadow-sm">
                <p className="text-xs text-slate-500">Smart Discovery</p>
                <p className="text-base font-bold text-slate-900">Nearby First</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-white/60 p-4 shadow-sm">
                <p className="text-xs text-slate-500">Fast Access</p>
                <p className="text-base font-bold text-slate-900">1-Tap Booking</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-[rgb(30,190,118)]/10 border border-[rgb(30,190,118)]/30 p-4 flex items-center gap-2 text-[rgb(20,138,86)]">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Built for speed, trust, and local growth.</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="order-1 md:order-2 rounded-3xl border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_20px_45px_rgba(15,23,42,0.12)] p-4 sm:p-6 md:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
