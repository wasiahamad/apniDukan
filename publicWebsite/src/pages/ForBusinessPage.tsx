import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Store, Frown, Smile, ArrowRight, Calculator, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import { motion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { getDukandarOnboardingUrl } from "@/lib/dukandarDashboard";
import { fetchPublicPlans } from "@/lib/plansApi";

export default function ForBusinessPage() {
  const { t } = useTranslation();

  const problems = useMemo(
    () => [
      {
        icon: Frown,
        title: t("forBusinessPage.problems.p1.title"),
        desc: t("forBusinessPage.problems.p1.desc"),
      },
      {
        icon: Frown,
        title: t("forBusinessPage.problems.p2.title"),
        desc: t("forBusinessPage.problems.p2.desc"),
      },
      {
        icon: Frown,
        title: t("forBusinessPage.problems.p3.title"),
        desc: t("forBusinessPage.problems.p3.desc"),
      },
    ],
    [t]
  );

  const solutions = useMemo(
    () => [
      {
        icon: Smile,
        title: t("forBusinessPage.solutions.s1.title"),
        desc: t("forBusinessPage.solutions.s1.desc"),
      },
      {
        icon: Smile,
        title: t("forBusinessPage.solutions.s2.title"),
        desc: t("forBusinessPage.solutions.s2.desc"),
      },
      {
        icon: Smile,
        title: t("forBusinessPage.solutions.s3.title"),
        desc: t("forBusinessPage.solutions.s3.desc"),
      },
    ],
    [t]
  );

  const fallbackPlans = useMemo(
    () => [
      {
        name: t("forBusinessPage.plans.free.name"),
        price: 0,
        billingCycle: t("forBusinessPage.plans.free.billingCycle"),
        features: [
          t("forBusinessPage.plans.free.features.f1"),
          t("forBusinessPage.plans.free.features.f2"),
          t("forBusinessPage.plans.free.features.f3"),
          t("forBusinessPage.plans.free.features.f4"),
          t("forBusinessPage.plans.free.features.f5"),
        ],
        cta: t("forBusinessPage.plans.free.cta"),
      },
      {
        name: t("forBusinessPage.plans.pro.name"),
        price: 499,
        billingCycle: t("forBusinessPage.plans.pro.billingCycle"),
        popular: true,
        features: [
          t("forBusinessPage.plans.pro.features.f1"),
          t("forBusinessPage.plans.pro.features.f2"),
          t("forBusinessPage.plans.pro.features.f3"),
          t("forBusinessPage.plans.pro.features.f4"),
          t("forBusinessPage.plans.pro.features.f5"),
          t("forBusinessPage.plans.pro.features.f6"),
          t("forBusinessPage.plans.pro.features.f7"),
        ],
        cta: t("forBusinessPage.plans.pro.cta"),
      },
      {
        name: t("forBusinessPage.plans.premium.name"),
        price: 999,
        billingCycle: t("forBusinessPage.plans.premium.billingCycle"),
        features: [
          t("forBusinessPage.plans.premium.features.f1"),
          t("forBusinessPage.plans.premium.features.f2"),
          t("forBusinessPage.plans.premium.features.f3"),
          t("forBusinessPage.plans.premium.features.f4"),
          t("forBusinessPage.plans.premium.features.f5"),
          t("forBusinessPage.plans.premium.features.f6"),
          t("forBusinessPage.plans.premium.features.f7"),
          t("forBusinessPage.plans.premium.features.f8"),
        ],
        cta: t("forBusinessPage.plans.premium.cta"),
      },
    ],
    [t]
  );

  const plansQuery = useQuery({
    queryKey: ["public-plans"],
    queryFn: fetchPublicPlans,
  });

  return (
    <PageTransition>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <Trans i18nKey="forBusinessPage.hero.title" components={{ highlight: <span className="text-primary" /> }} />
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">{t("forBusinessPage.hero.subtitle")}</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer")}
              >
                <Store className="h-5 w-5" /> {t("forBusinessPage.hero.cta")}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problems */}
      <section className="container py-16">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-center mb-10">{t("forBusinessPage.problems.title")}</h2>
        </ScrollReveal>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <StaggerItem key={i}>
              <Card className="border-destructive/20">
                <CardContent className="p-6 text-center">
                  <p.icon className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-sm">{p.desc}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* Solutions */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-center mb-10">{t("forBusinessPage.solutions.title")}</h2>
          </ScrollReveal>
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {solutions.map((s, i) => (
              <StaggerItem key={i}>
                <Card className="border-primary/20">
                  <CardContent className="p-6 text-center">
                    <s.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-muted-foreground text-sm">{s.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Earnings Example */}
      <section className="container py-16">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-center mb-10">{t("forBusinessPage.earnings.title")}</h2>
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calculator className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">{t("forBusinessPage.earnings.exampleTitle")}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("forBusinessPage.earnings.rows.monthlyCustomers")}</span>
                  <span className="font-medium">50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("forBusinessPage.earnings.rows.avgOrderValue")}</span>
                  <span className="font-medium">₹500</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">{t("forBusinessPage.earnings.rows.extraMonthlyRevenue")}</span>
                  <span className="font-bold text-primary text-lg">₹25,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("forBusinessPage.earnings.rows.proPlanCost")}</span>
                  <span className="font-medium">-₹499</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">{t("forBusinessPage.earnings.rows.netProfit")}</span>
                  <span className="font-bold text-primary text-xl">₹24,501{t("forBusinessPage.earnings.perMonthSuffix")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>

      {/* Pricing */}
      <section className="container py-16">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">{t("forBusinessPage.pricing.title")}</h2>
          <p className="text-muted-foreground text-center mb-10">{t("forBusinessPage.pricing.subtitle")}</p>
        </ScrollReveal>

        {plansQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="relative">
                <CardHeader className="text-center">
                  <Skeleton className="h-5 w-24 mx-auto" />
                  <div className="mt-2 flex items-baseline justify-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-6">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {(plansQuery.isError ? fallbackPlans : plansQuery.data || []).map((plan: any) => (
              <StaggerItem key={plan.name}>
                <Card className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      {t("forBusinessPage.pricing.mostPopular")}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">₹{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/{plan.billingCycle}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {(plan.features || []).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                      <a href={getDukandarOnboardingUrl()} target="_blank" rel="noreferrer noopener">
                        {plan.cta}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </section>

      {/* Final CTA */}
      <ScrollReveal>
        <section className="bg-primary py-16">
          <div className="container text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">{t("forBusinessPage.finalCta.title")}</h2>
            <p className="text-primary-foreground/80 mb-6">{t("forBusinessPage.finalCta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer")}
                >
                  {t("forBusinessPage.finalCta.primaryCta")}
                </Button>
              </motion.div>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/pricing">
                  {t("forBusinessPage.finalCta.secondaryCta")} <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </PageTransition>
  );
}
