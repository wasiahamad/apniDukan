import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FiBookOpen, FiGift, FiGrid, FiHome, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const items = [
  { key: "home", labelKey: "nav.home", icon: FiHome },
  { key: "categories", labelKey: "nav.categories", icon: FiGrid },
  { key: "stories", labelKey: "nav.stories", icon: FiBookOpen },
  { key: "referral", labelKey: "nav.referralShort", icon: FiGift },
  { key: "profile", labelKey: "nav.profile", icon: FiUser },
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
    if (key === "profile") navigate("/account");
  };

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="mx-auto max-w-md rounded-2xl border bg-card/95 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              (item.key === "home" && location.pathname === "/") ||
              (item.key === "categories" && location.pathname.startsWith("/categories")) ||
              (item.key === "stories" && location.pathname.startsWith("/stories")) ||
              (item.key === "referral" && location.pathname.startsWith("/referral-program")) ||
              (item.key === "profile" && location.pathname.startsWith("/account"));

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
                    "flex flex-col items-center justify-center py-3 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <motion.div animate={active ? { y: [0, -1, 0] } : { y: 0 }} transition={{ duration: 0.24 }}>
                    <Icon className="h-[18px] w-[18px]" />
                  </motion.div>
                    <span className="text-[11px] leading-none mt-1">{t(item.labelKey)}</span>
                  <div className="relative mt-2 h-0.5 w-6">
                    {active ? (
                      <motion.span
                        layoutId="mobile-nav-active-pill"
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      />
                    ) : null}
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
