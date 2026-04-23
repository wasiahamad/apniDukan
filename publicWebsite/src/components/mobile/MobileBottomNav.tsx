import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BriefcaseBusiness, Film, Gift, House, Layers3 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const items = [
  { key: "home", labelKey: "nav.home", icon: House },
  { key: "categories", labelKey: "nav.categories", icon: Layers3 },
  { key: "stories", labelKey: "nav.stories", icon: Film },
  { key: "referral", labelKey: "nav.referralShort", icon: Gift },
  { key: "business", labelKey: "nav.forBusinessShort", icon: BriefcaseBusiness },
] as const;

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const goTo = (key: (typeof items)[number]["key"]) => {
    if (key === "home") navigate("/");
    if (key === "categories") navigate("/categories");
    if (key === "stories") navigate("/stories");
    if (key === "referral") navigate("/referral-program");
    if (key === "business") navigate("/for-business");
  };

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="mx-auto max-w-md rounded-2xl border bg-card/95 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              (item.key === "home" && location.pathname === "/") ||
              (item.key === "categories" && (location.pathname.startsWith("/categories") || location.pathname.startsWith("/shops"))) ||
              (item.key === "stories" && location.pathname.startsWith("/stories")) ||
              (item.key === "referral" && location.pathname.startsWith("/referral-program")) ||
              (item.key === "business" && location.pathname.startsWith("/for-business"));

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => goTo(item.key)}
                className="relative w-full"
              >
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <motion.div
                    animate={active ? { y: [0, -1, 0] } : { y: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </motion.div>
                  <span className="relative inline-flex px-1 leading-none">
                    {t(item.labelKey)}
                    {active ? (
                      <motion.span
                        layoutId="mobile-nav-active-pill"
                        className="absolute left-0 right-0 top-[calc(100%+6px)] h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      />
                    ) : null}
                  </span>
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
