import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_90%_10%,hsl(var(--secondary)/0.20),transparent_30%),linear-gradient(180deg,hsl(var(--muted)),hsl(var(--background)))] py-4 md:py-8">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="order-2 md:order-1 hidden md:flex rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl shadow-xl p-8 flex-col justify-between overflow-hidden relative"
          >
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -left-20 -bottom-16 h-48 w-48 rounded-full bg-secondary/25 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <img src="/logo-removebg-preview.png" alt="PublicDukan" className="h-10 w-10" loading="lazy" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">
                    Public<span className="text-primary">Dukan</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{t("auth.layout.tagline")}</p>
                </div>
              </div>

              <h2 className="mt-10 text-4xl font-black leading-tight text-foreground">
                {t("auth.layout.title")}
              </h2>
              <p className="mt-4 text-muted-foreground max-w-md">
                {t("auth.layout.desc")}
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-8">
              <div className="rounded-2xl bg-card/70 border border-border/60 p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">{t("auth.layout.features.discovery.label")}</p>
                <p className="text-base font-bold text-foreground">{t("auth.layout.features.discovery.value")}</p>
              </div>
              <div className="rounded-2xl bg-card/70 border border-border/60 p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">{t("auth.layout.features.access.label")}</p>
                <p className="text-base font-bold text-foreground">{t("auth.layout.features.access.value")}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-primary/10 border border-primary/30 p-4 flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("auth.layout.features.note")}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="order-1 md:order-2 rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-xl p-4 sm:p-6 md:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
