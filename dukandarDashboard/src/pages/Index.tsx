import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Star, MessageCircle, BarChart3, Globe, CheckCircle2, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { setPreferredLanguage } from "@/lib/language";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { planApi, type Plan } from "@/lib/api/index";
import { buildPlanFeatureSummary } from "@/lib/planFeatures";
import { useAuth } from "@/contexts/AuthContext";

const PLATFORM_LOGO_SRC = "/logo-removebg-preview.png";

type PricingCard = {
  id: string;
  name: string;
  priceText: string;
  periodText: string;
  cta: string;
  featured: boolean;
  features: string[];
};

const getFallbackPricingCards = (t: (key: string, options?: any) => string): PricingCard[] => [
  {
    id: "free",
    name: t("index.fallbackPlans.free.name"),
    priceText: "₹0",
    periodText: t("index.billing.forever"),
    cta: t("index.fallbackPlans.free.cta"),
    featured: false,
    features: [
      t("index.fallbackPlans.free.features.basicListing"),
      t("index.fallbackPlans.free.features.whatsappButton"),
      t("index.fallbackPlans.free.features.max10"),
      t("index.fallbackPlans.free.features.perfectForStart"),
    ],
  },
  {
    id: "starter",
    name: t("index.fallbackPlans.starter.name"),
    priceText: "₹199",
    periodText: t("index.billing.month"),
    cta: t("index.fallbackPlans.starter.cta"),
    featured: true,
    features: [
      t("index.fallbackPlans.starter.features.basicListing"),
      t("index.fallbackPlans.starter.features.whatsappButton"),
      t("index.fallbackPlans.starter.features.publicShop"),
      t("index.fallbackPlans.starter.features.max50"),
      t("index.fallbackPlans.starter.features.featured"),
      t("index.fallbackPlans.starter.features.analytics"),
    ],
  },
  {
    id: "pro",
    name: t("index.fallbackPlans.pro.name"),
    priceText: "₹499",
    periodText: t("index.billing.month"),
    cta: t("index.fallbackPlans.pro.cta"),
    featured: false,
    features: [
      t("index.fallbackPlans.pro.features.basicListing"),
      t("index.fallbackPlans.pro.features.whatsappButton"),
      t("index.fallbackPlans.pro.features.publicShop"),
      t("index.fallbackPlans.pro.features.max200"),
      t("index.fallbackPlans.pro.features.featured"),
      t("index.fallbackPlans.pro.features.domain"),
      t("index.fallbackPlans.pro.features.analytics"),
      t("index.fallbackPlans.pro.features.api"),
      t("index.fallbackPlans.pro.features.prioritySupport"),
    ],
  },
];

const inferBillingCycleFromDays = (days?: number): "monthly" | "quarterly" | "yearly" | null => {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return null;
  if (d >= 360) return "yearly";
  if (d >= 85) return "quarterly";
  if (d >= 28 && d <= 31) return "monthly";
  return null;
};

const getPeriodText = (
  t: (key: string, options?: any) => string,
  price: number,
  durationInDays: number,
  billingCycle?: "monthly" | "quarterly" | "yearly"
) => {
  const cycle = billingCycle || inferBillingCycleFromDays(durationInDays);
  if (cycle === "monthly") return t("index.billing.month");
  if (cycle === "quarterly") return t("index.billing.quarterly");
  if (cycle === "yearly") return t("index.billing.year");
  if (price <= 0) return t("index.billing.forever");
  return t("index.billing.days", { count: durationInDays });
};

const getCtaText = (t: (key: string, options?: any) => string, plan: Plan) => {
  if (plan.price <= 0) return t("index.cta.startFree");
  if (plan.isPopular) return t("index.cta.choosePlan", { name: plan.name });
  return t("index.cta.getStarted");
};

const Index = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const plansRes = await planApi.getPlans();
        if (!cancelled && plansRes.success && plansRes.data && plansRes.data.length > 0) {
          setPlans(plansRes.data);
        }
      } catch (error) {
        // Keep static pricing fallback when API is unavailable.
      } finally {
        if (!cancelled) setIsPlansLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pricingCards = useMemo<PricingCard[]>(() => {
    if (plans.length === 0) return getFallbackPricingCards(t);

    return plans.map((plan) => {
      const maxListingsCount = (plan.features as any)?.maxListings;
      const maxListingsLine =
        typeof maxListingsCount === "number"
          ? t("planFeatures.maxListings", { count: maxListingsCount })
          : null;

      const mappedFeatures = buildPlanFeatureSummary(plan.features, t)
        .map((item) => {
          if (maxListingsLine && item === maxListingsLine) {
            return item.replace(/^[^:]+:/, t("index.fallbackPlans.productsServicesLabel"));
          }
          return item;
        })
        .slice(0, 9);

      if (plan.description && mappedFeatures.length < 4) {
        mappedFeatures.push(plan.description);
      }

      return {
        id: plan._id,
        name: plan.name,
        priceText: `₹${plan.price}`,
        periodText: getPeriodText(t, plan.price, plan.durationInDays, plan.billingCycle),
        cta: getCtaText(t, plan),
        featured: Boolean(plan.isPopular),
        features: mappedFeatures.length > 0 ? mappedFeatures : [t("index.fallbackPlans.businessGrowthIncluded")],
      };
    });
  }, [plans, t, i18n.language]);

  const primaryCtaRoute = isAuthenticated ? "/dashboard" : "/login";
  const primaryCtaLabel = isAuthenticated ? t("index.navDashboard") : t("index.navLogin");
  const heroCtaLabel = isAuthenticated ? t("index.navCtaDashboard") : t("index.navCtaStartFree");

  return (
    <div className="min-h-screen bg-background">
    {/* Nav */}
    <nav className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={PLATFORM_LOGO_SRC} alt={t('app.name')} className="w-12 h-12 object-cover" />
        </div>
        <span className="font-bold text-lg text-foreground">{t('app.name')}</span>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <Languages className="h-4 w-4" />
              {t('common.language')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => { setPreferredLanguage('en'); i18n.changeLanguage('en'); }}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setPreferredLanguage('hi'); i18n.changeLanguage('hi'); }}>हिंदी</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link to={primaryCtaRoute} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20">
          {primaryCtaLabel}
        </Link>
      </div>
    </nav>

    {/* Hero */}
    <section className="px-4 py-16 max-w-3xl mx-auto text-center">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-4">
          {t('index.hero.badge')}
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight mb-4">
          {t('index.hero.titlePrefix')}<br /><span className="text-primary">{t('index.hero.titleHighlight')}</span>
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {t('index.hero.description')}
        </p>
        <Link to={primaryCtaRoute}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold text-base shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-shadow">
          {heroCtaLabel} <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </section>

    {/* Features */}
    <section className="px-4 py-12 max-w-4xl mx-auto">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Globe, title: t('index.features.instantWebsite.title'), desc: t('index.features.instantWebsite.desc') },
          { icon: MessageCircle, title: t('index.features.whatsappOrders.title'), desc: t('index.features.whatsappOrders.desc') },
          { icon: BarChart3, title: t('index.features.smartAnalytics.title'), desc: t('index.features.smartAnalytics.desc') },
        ].map((f, i) => (
          <motion.div key={f.title} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.1 }}
            className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Demo Shop */}
    <section className="px-4 py-12 max-w-4xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-foreground mb-2">{t('index.demoShop.title')}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t('index.demoShop.subtitle')}</p>
      <a
        href="https://ram-kirana-store.publicdukan.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 bg-card border px-6 py-3 rounded-xl font-semibold text-primary hover:shadow-lg transition-shadow"
      >
        <Star className="w-4 h-4" /> {t('index.demoShop.visitLabel')}
      </a>
    </section>

    {/* Pricing */}
    <section className="px-4 py-12 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-foreground mb-2">{t('index.pricing.title')}</h2>
        <p className="text-muted-foreground">{t('index.pricing.subtitle')}</p>
        {isPlansLoading ? <p className="text-xs text-muted-foreground mt-2">{t('index.pricing.loadingPlans')}</p> : null}
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {pricingCards.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-2xl border bg-card p-6 shadow-sm ${plan.featured ? "border-primary shadow-lg shadow-primary/20" : ""}`}
          >
            {plan.featured ? (
              <span className="inline-block -mt-10 mb-3 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                {t('index.pricing.mostPopular')}
              </span>
            ) : null}

            <h3 className="text-3xl font-bold text-foreground mb-2">{plan.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-foreground">{plan.priceText}</span>
              <span className="text-muted-foreground">{plan.periodText}</span>
            </div>

            <ul className="space-y-3 mb-7">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-left text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to={primaryCtaRoute}
              className={`block w-full text-center rounded-xl px-4 py-3 font-semibold transition-shadow ${
                plan.featured
                  ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
                  : "bg-background border text-foreground hover:shadow-md"
              }`}
            >
              {isAuthenticated ? t('index.pricing.openDashboard') : plan.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Footer */}
    <footer className="px-4 py-8 border-t text-center text-xs text-muted-foreground">
      {t('index.footer', { appName: t('app.name') })}
    </footer>
    </div>
  );
};

export default Index;
