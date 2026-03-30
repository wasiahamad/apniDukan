import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Star, MessageCircle, BarChart3, Globe, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { planApi, type Plan } from "@/lib/api/index";
import { buildPlanFeatureSummary } from "@/lib/planFeatures";

type PricingCard = {
  id: string;
  name: string;
  priceText: string;
  periodText: string;
  cta: string;
  featured: boolean;
  features: string[];
};

const FALLBACK_PRICING_CARDS: PricingCard[] = [
  {
    id: "free",
    name: "Free",
    priceText: "₹0",
    periodText: "/forever",
    cta: "Start Free",
    featured: false,
    features: ["Basic shop listing", "WhatsApp button", "10 products/services", "Perfect for getting started"],
  },
  {
    id: "starter",
    name: "Starter",
    priceText: "₹199",
    periodText: "/month",
    cta: "Choose Starter",
    featured: true,
    features: [
      "Basic shop listing",
      "WhatsApp button",
      "Public shop page",
      "50 products/services",
      "Featured listing",
      "Advanced analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceText: "₹499",
    periodText: "/month",
    cta: "Start Pro Trial",
    featured: false,
    features: [
      "Basic shop listing",
      "WhatsApp button",
      "Public shop page",
      "200 products/services",
      "Featured listing",
      "Custom domain",
      "Advanced analytics",
      "API access",
      "Priority support",
    ],
  },
];

const getPeriodText = (price: number, durationInDays: number) => {
  if (price <= 0) return "/forever";
  if (durationInDays === 30) return "/month";
  if (durationInDays === 365) return "/year";
  return `/${durationInDays} days`;
};

const getCtaText = (plan: Plan) => {
  if (plan.price <= 0) return "Start Free";
  if (plan.isPopular) return `Choose ${plan.name}`;
  return "Get Started";
};

const Index = () => {
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
    if (plans.length === 0) return FALLBACK_PRICING_CARDS;

    return plans.map((plan) => {
      const mappedFeatures = buildPlanFeatureSummary(plan.features)
        .map((item) => item.replace(/^Max listings:/, "Products/services:"))
        .slice(0, 9);

      if (plan.description && mappedFeatures.length < 4) {
        mappedFeatures.push(plan.description);
      }

      return {
        id: plan._id,
        name: plan.name,
        priceText: `₹${plan.price}`,
        periodText: getPeriodText(plan.price, plan.durationInDays),
        cta: getCtaText(plan),
        featured: Boolean(plan.isPopular),
        features: mappedFeatures.length > 0 ? mappedFeatures : ["Business growth features included"],
      };
    });
  }, [plans]);

  return (
    <div className="min-h-screen bg-background">
    {/* Nav */}
    <nav className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-foreground">DukaanSetu</span>
      </div>
      <Link to="/login" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20">
        Login
      </Link>
    </nav>

    {/* Hero */}
    <section className="px-4 py-16 max-w-3xl mx-auto text-center">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-4">
          🚀 #1 Platform for Local Businesses
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight mb-4">
          Apni Dukaan Ko<br /><span className="text-primary">Online</span> Le Jaayein
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Create your professional shop website in minutes. Get orders on WhatsApp. No technical skills needed.
        </p>
        <Link to="/login"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold text-base shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-shadow">
          Start Free <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </section>

    {/* Features */}
    <section className="px-4 py-12 max-w-4xl mx-auto">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Globe, title: "Instant Website", desc: "Your shop goes live in minutes with a custom URL" },
          { icon: MessageCircle, title: "WhatsApp Orders", desc: "Customers order directly on WhatsApp" },
          { icon: BarChart3, title: "Smart Analytics", desc: "Track views, clicks, and growth" },
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
      <h2 className="text-2xl font-bold text-foreground mb-2">See a Demo Shop</h2>
      <p className="text-sm text-muted-foreground mb-6">Experience what your customers will see</p>
      <Link to="/shop/ram-kirana-store"
        className="inline-flex items-center gap-2 bg-card border px-6 py-3 rounded-xl font-semibold text-primary hover:shadow-lg transition-shadow">
        <Star className="w-4 h-4" /> Visit Ram Kirana Store
      </Link>
    </section>

    {/* Pricing */}
    <section className="px-4 py-12 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-foreground mb-2">Simple Pricing 💰</h2>
        <p className="text-muted-foreground">Apne business ke liye sahi plan choose karo</p>
        {isPlansLoading ? <p className="text-xs text-muted-foreground mt-2">Plans load ho rahe hain...</p> : null}
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
                Most Popular
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
              to="/login"
              className={`block w-full text-center rounded-xl px-4 py-3 font-semibold transition-shadow ${
                plan.featured
                  ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
                  : "bg-background border text-foreground hover:shadow-md"
              }`}
            >
              {plan.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Footer */}
    <footer className="px-4 py-8 border-t text-center text-xs text-muted-foreground">
      © 2026 DukaanSetu. Made with ❤️ for Indian businesses.
    </footer>
    </div>
  );
};

export default Index;
