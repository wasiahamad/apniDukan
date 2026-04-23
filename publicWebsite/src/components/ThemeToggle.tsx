import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const effectiveTheme = useMemo(() => {
    if (!mounted) return "light";
    return (theme === "system" ? resolvedTheme : theme) || "light";
  }, [mounted, resolvedTheme, theme]);

  const isDark = effectiveTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label={isDark ? t("theme.toggleToLight") : t("theme.toggleToDark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
