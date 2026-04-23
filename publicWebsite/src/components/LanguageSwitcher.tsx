import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import i18n, { LANGUAGE_STORAGE_KEY, SupportedLanguage } from "@/i18n";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const setLanguage = async (lang: SupportedLanguage) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  await i18n.changeLanguage(lang);
};

export default function LanguageSwitcher() {
  const { i18n: i18nInstance, t } = useTranslation();
  const current = (i18nInstance.language === "hi" ? "hi" : "en") as SupportedLanguage;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Language">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("en")}>
          {current === "en" ? "✓ " : ""}
          {t("language.english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("hi")}>
          {current === "hi" ? "✓ " : ""}
          {t("language.hindi")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
