import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cities as fallbackCities, categories as fallbackCategories } from "@/data/mockData";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";

export default function Footer() {
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
    if (allShops.length === 0) return fallbackCities;

    const cityMap = new Map<string, { name: string; slug: string; totalShops: number }>();
    allShops.forEach((shop) => {
      const slug = shop.citySlug;
      const existing = cityMap.get(slug);
      if (existing) {
        existing.totalShops += 1;
      } else {
        cityMap.set(slug, { name: shop.city, slug, totalShops: 1 });
      }
    });

    return Array.from(cityMap.values()).sort((a, b) => b.totalShops - a.totalShops || a.name.localeCompare(b.name));
  }, [allShops]);

  const categories = businessTypesQuery.data && businessTypesQuery.data.length > 0 ? businessTypesQuery.data : fallbackCategories;
  const defaultCitySlug = cities[0]?.slug || "delhi";

  return (
    <footer className="border-t bg-card mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <Store className="h-6 w-6 text-primary" />
              <span>Dukaan<span className="text-primary">Direct</span></span>
            </Link>
            <p className="text-sm text-muted-foreground">
              India ka apna local business platform. Apni dukaan online lao, customers paao.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About Us</Link>
              <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Cities */}
          <div>
            <h4 className="font-semibold mb-3">Cities</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {cities.slice(0, 5).map((c) => (
                <Link key={c.slug} to={`/${c.slug}`} className="hover:text-primary transition-colors">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-3">Categories</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {categories.slice(0, 8).map((c) => (
                <Link key={c.slug} to={`/${defaultCitySlug}/${c.slug}`} className="hover:text-primary transition-colors">
                  {c.icon || "🏪"} {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          © 2026 DukaanDirect. Made with ❤️ in India.
        </div>
      </div>
    </footer>
  );
}
