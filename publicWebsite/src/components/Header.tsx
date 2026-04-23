import GlobalSearch from "@/components/GlobalSearch";
import MobileDrawer from "@/components/mobile/MobileDrawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDukandarOnboardingUrl } from "@/lib/dukandarDashboard";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";
import { useQuery } from "@tanstack/react-query";
import { CircleHelp, Plus, Settings, Store, UserCircle2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

const getInitials = (value?: string) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const navItemBaseClass =
    "inline-flex items-center h-10 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap";

  const [citiesMenuOpen, setCitiesMenuOpen] = useState(false);
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const hoverCloseTimers = useRef<{ cities?: number; categories?: number }>({});

  const cancelHoverClose = (key: "cities" | "categories") => {
    const id = hoverCloseTimers.current[key];
    if (id) window.clearTimeout(id);
    hoverCloseTimers.current[key] = undefined;
  };

  const scheduleHoverClose = (key: "cities" | "categories") => {
    cancelHoverClose(key);
    hoverCloseTimers.current[key] = window.setTimeout(() => {
      if (key === "cities") setCitiesMenuOpen(false);
      if (key === "categories") setCategoriesMenuOpen(false);
    }, 120);
  };

  const shopsQuery = useQuery({
    queryKey: ["public-shops", i18n.language],
    queryFn: () => fetchPublicShops(),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types", i18n.language],
    queryFn: fetchBusinessTypes,
  });

  const allShops = shopsQuery.data || [];

  const cities = useMemo(() => {
    const cityMap = new Map<string, { name: string; slug: string; totalShops: number }>();

    allShops.forEach((shop) => {
      const slug = shop.citySlug;
      const existing = cityMap.get(slug);
      if (existing) {
        existing.totalShops += 1;
      } else {
        cityMap.set(slug, {
          name: shop.city,
          slug,
          totalShops: 1,
        });
      }
    });

    return Array.from(cityMap.values()).sort((a, b) => b.totalShops - a.totalShops || a.name.localeCompare(b.name));
  }, [allShops]);

  const categories = businessTypesQuery.data || [];

  const defaultCitySlug = cities[0]?.slug || "delhi";

  const handleLogout = () => {
    logout();
    toast({ title: t("header.signedOutTitle"), description: t("header.signedOutDesc") });
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:gap-6">
        <Link to="/" className="flex items-center font-bold text-xl shrink-0">
          <img
            src="/logo-removebg-preview.png"
            alt="PublicDukan"
            className="h-14 w-14 md:h-14 md:w-14 object-cover shrink-0"
            loading="eager"
          />
          <span className="text-foreground leading-none">Public<span className="text-primary">Dukan</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center justify-center gap-6 flex-1 min-w-0">
          <Link
            to="/"
            className={`${navItemBaseClass} ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
          >
            {t("nav.home")}
          </Link>

          <Link
            to="/stories"
            className={`${navItemBaseClass} ${location.pathname === "/stories" ? "text-primary" : "text-muted-foreground"}`}
          >
            {t("nav.stories")}
          </Link>

          <Link
            to="/referral-program"
            className={`${navItemBaseClass} ${
              location.pathname.startsWith("/referral-program") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {t("nav.referral")}
          </Link>

          {/* Cities Dropdown */}
          <DropdownMenu open={citiesMenuOpen} onOpenChange={setCitiesMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onMouseEnter={() => {
                  cancelHoverClose("cities");
                  setCitiesMenuOpen(true);
                }}
                onMouseLeave={() => scheduleHoverClose("cities")}
                className={`${navItemBaseClass} cursor-pointer ${
                  cities.some((c) => location.pathname === `/${c.slug}`) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t("nav.cities")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              onMouseEnter={() => cancelHoverClose("cities")}
              onMouseLeave={() => scheduleHoverClose("cities")}
            >
              {cities.length > 0 ? (
                cities.map(city => (
                  <DropdownMenuItem key={city.slug} onClick={() => navigate(`/${city.slug}`)}>
                    📍 {city.name} ({t("header.cities.shopCount", { count: city.totalShops })})
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  {t("header.cities.empty")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Categories Dropdown */}
          <DropdownMenu open={categoriesMenuOpen} onOpenChange={setCategoriesMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onMouseEnter={() => {
                  cancelHoverClose("categories");
                  setCategoriesMenuOpen(true);
                }}
                onMouseLeave={() => scheduleHoverClose("categories")}
                className={`${navItemBaseClass} cursor-pointer ${
                  categories.some((c) => location.pathname.includes(`/${c.slug}`)) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t("nav.categories")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              onMouseEnter={() => cancelHoverClose("categories")}
              onMouseLeave={() => scheduleHoverClose("categories")}
            >
              {categories.length > 0 ? (
                categories.map(cat => (
                  <DropdownMenuItem key={cat.slug} onClick={() => navigate(`/shops/${cat.slug}`)}>
                    {cat.icon || "🏪"} {cat.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  {t("header.categories.empty")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/for-business"
            className={`${navItemBaseClass} ${
              location.pathname === "/for-business" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {t("nav.forBusiness")}
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0 md:justify-self-end">
          <GlobalSearch />
          <LanguageSwitcher />
          <ThemeToggle />
          {/* <Button asChild>
            <a
              href={getDukandarOnboardingUrl()}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("actions.createShop")}
            </a>
          </Button> */}
          {!isAuthenticated ? (
            <>
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <Link to="/login">{t("actions.login")}</Link>
              </Button>
              <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-all duration-200 hover:-translate-y-0.5">
                <Link to="/signup">{t("actions.signup")}</Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring/40">
                  <Avatar className="h-10 w-10 border border-primary/30">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.name || "User"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/signup")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("header.menu.addAccount")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <UserCircle2 className="h-4 w-4 mr-2" />
                  {t("header.menu.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account?tab=settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t("actions.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/contact")}>
                  <CircleHelp className="h-4 w-4 mr-2" />
                  {t("actions.help")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={handleLogout}>
                  <span className="mr-2">↪</span>
                  {t("actions.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <MobileDrawer
            trigger={
              <button
                type="button"
                aria-label="Open account"
                className="rounded-full transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <Avatar className="h-10 w-10 border border-primary/30">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
        </div>
      </div>
    </header>
  );
}
