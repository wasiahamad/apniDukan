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
import { usePlan } from "@/context/PlanContext";
import { useToast } from "@/hooks/use-toast";
import { getDukandarOnboardingUrl } from "@/lib/dukandarDashboard";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";
import { useQuery } from "@tanstack/react-query";
import { CircleHelp, Menu, Plus, Settings, Sparkles, Store, UserCircle2 } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
  const { currentPlan } = usePlan();
  const { toast } = useToast();

  const shopsQuery = useQuery({
    queryKey: ["public-shops"],
    queryFn: () => fetchPublicShops(),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types"],
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
    toast({ title: "Signed out", description: "You have been logged out." });
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Store className="h-7 w-7 text-primary" />
          <span className="text-foreground">Dukaan<span className="text-primary">Direct</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>

          {/* Cities Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
              cities.some(c => location.pathname === `/${c.slug}`) ? "text-primary" : "text-muted-foreground"
            }`}>
              Cities
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {cities.length > 0 ? (
                cities.map(city => (
                  <DropdownMenuItem key={city.slug} onClick={() => navigate(`/${city.slug}`)}>
                    📍 {city.name} ({city.totalShops} shops)
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No cities yet
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Categories Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
              categories.some((c) => location.pathname.includes(`/${c.slug}`)) ? "text-primary" : "text-muted-foreground"
            }`}>
              Categories
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {categories.length > 0 ? (
                categories.map(cat => (
                  <DropdownMenuItem key={cat.slug} onClick={() => navigate(`/${defaultCitySlug}/${cat.slug}`)}>
                    {cat.icon || "🏪"} {cat.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No categories yet
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/for-business"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/for-business" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            For Business
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <GlobalSearch />
          <Button asChild>
            <a
              href={getDukandarOnboardingUrl()}
              target="_blank"
              rel="noreferrer noopener"
            >
              Apni Dukaan Banaye
            </a>
          </Button>
          {!isAuthenticated ? (
            <>
              <Button asChild variant="outline" className="border-[rgb(30,190,118)] text-[rgb(30,190,118)] hover:bg-[rgb(30,190,118)]/10">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white transition-all duration-200 hover:-translate-y-0.5">
                <Link to="/signup">Signup</Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[rgb(30,190,118)]/40">
                  <Avatar className="h-10 w-10 border border-[rgb(30,190,118)]/30">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-[rgb(30,190,118)]/10 text-[rgb(30,190,118)] font-semibold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="py-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || "User"}</p>
                  <p className="text-xs font-medium text-slate-500">{currentPlan.name}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/signup")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add another account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/account?tab=plan")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <UserCircle2 className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account?tab=settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/contact")}>
                  <CircleHelp className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={handleLogout}>
                  <span className="mr-2">↪</span>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-1 md:hidden">
          <GlobalSearch />
          <MobileDrawer
            cities={cities}
            categories={categories}
            defaultCitySlug={defaultCitySlug}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
        </div>
      </div>
    </header>
  );
}
