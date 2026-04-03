import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { House, Layers3, MapPin, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { key: "home", label: "Home", icon: House },
  { key: "categories", label: "Categories", icon: Layers3 },
  { key: "nearby", label: "Nearby", icon: MapPin },
  { key: "account", label: "My Account", icon: User },
] as const;

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const goTo = (key: (typeof items)[number]["key"]) => {
    if (key === "home") navigate("/");
    if (key === "categories") navigate("/shops");
    if (key === "nearby") navigate(isAuthenticated ? "/account?tab=shops" : "/login");
    if (key === "account") navigate(isAuthenticated ? "/account" : "/login");
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            (item.key === "home" && location.pathname === "/") ||
            (item.key === "categories" && location.pathname.startsWith("/shops")) ||
            (item.key === "nearby" && location.pathname.startsWith("/account") && location.search.includes("tab=shops")) ||
            (item.key === "account" && location.pathname.startsWith("/account"));

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => goTo(item.key)}
              className="relative"
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active-pill"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 w-10 rounded-b-full bg-[rgb(30,190,118)]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              ) : null}
              <motion.div
                whileTap={{ scale: 0.94 }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-[rgb(30,190,118)]" : "text-slate-500",
              )}
              >
                <motion.div
                  animate={active ? { y: [0, -1, 0] } : { y: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  <Icon className="h-4 w-4" />
                </motion.div>
                <span>{item.label}</span>
              </motion.div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
