import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GlobalSearch from "@/components/GlobalSearch";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";
import { getDukandarOnboardingUrl } from "@/lib/dukandarDashboard";

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
            to="/pricing"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/pricing" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Pricing
          </Link>
          <Link
            to="/for-business"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/for-business" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            For Business
          </Link>
          <Link
            to="/contact"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/contact" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Contact
          </Link>
          <Link
            to="/account"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/account" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            My Account
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
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-1 md:hidden">
          <GlobalSearch />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-72 h-dvh overflow-y-auto pb-6">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-4 mt-8">
                <Link to="/" onClick={() => setOpen(false)} className="text-base font-medium py-2 hover:text-primary">
                  Home
                </Link>

                {/* Mobile Cities */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Cities</p>
                  <div className="flex flex-wrap gap-2">
                    {cities.map(city => (
                      <Button
                        key={city.slug}
                        variant="outline"
                        size="sm"
                        onClick={() => { navigate(`/${city.slug}`); setOpen(false); }}
                      >
                        📍 {city.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Mobile Categories */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <Button
                        key={cat.slug}
                        variant="outline"
                        size="sm"
                        onClick={() => { navigate(`/${defaultCitySlug}/${cat.slug}`); setOpen(false); }}
                      >
                        {cat.icon || "🏪"} {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Link to="/pricing" onClick={() => setOpen(false)} className="text-base font-medium py-2 hover:text-primary">
                  Pricing
                </Link>
                <Link to="/for-business" onClick={() => setOpen(false)} className="text-base font-medium py-2 hover:text-primary">
                  For Business
                </Link>
                <Link to="/contact" onClick={() => setOpen(false)} className="text-base font-medium py-2 hover:text-primary">
                  Contact
                </Link>
                <Link to="/account" onClick={() => setOpen(false)} className="text-base font-medium py-2 hover:text-primary">
                  My Account
                </Link>

                <Button
                  className="mt-4"
                  onClick={() => {
                    setOpen(false);
                    window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer");
                  }}
                >
                  Apni Dukaan Banaye
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
