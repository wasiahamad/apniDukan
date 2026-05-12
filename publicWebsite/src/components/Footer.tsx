import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cities as fallbackCities, categories as fallbackCategories } from "@/data/mockData";
import { groupCitiesFromShops } from "@/lib/cityGroups";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t, i18n } = useTranslation();
  const shopsQuery = useQuery({
    queryKey: ["public-shops", i18n.language],
    queryFn: () => fetchPublicShops(),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types", i18n.language],
    queryFn: fetchBusinessTypes,
  });

  const allShops = shopsQuery.data || [];

  const cities = useMemo(() => groupCitiesFromShops(allShops, fallbackCities), [allShops]);

  const categories = businessTypesQuery.data && businessTypesQuery.data.length > 0 ? businessTypesQuery.data : fallbackCategories;

  return (
    <footer className="border-t bg-card mt-3 md:mt-6">
      <div className="container py-8 md:py-9">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center font-bold text-lg mb-3">
              <img src="/logo-removebg-preview.png" alt="PublicDukan" className="h-12 w-12 object-cover" loading="lazy" />
              <span>Public<span className="text-primary">Dukan</span></span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-3">{t("footer.company")}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">{t("footer.about")}</Link>
              <Link to="/pricing" className="hover:text-primary transition-colors">{t("footer.pricing")}</Link>
              <Link to="/referral-program" className="hover:text-primary transition-colors">{t("footer.referral")}</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">{t("footer.contact")}</Link>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">{t("footer.privacy")}</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">{t("footer.terms")}</Link>
            </div>
          </div>

          {/* Cities */}
          <div>
            <h4 className="font-semibold mb-3">{t("footer.cities")}</h4>
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
            <h4 className="font-semibold mb-3">{t("footer.categories")}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {categories.slice(0, 5).map((c) => (
                <Link key={c.slug} to={`/shops/${c.slug}`} className="hover:text-primary transition-colors">
                  {c.icon || "🏪"} {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}
