import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicPlans } from "@/lib/plansApi";

export default function PricingPage() {
  const plansQuery = useQuery({
    queryKey: ["public-plans"],
    queryFn: fetchPublicPlans,
  });

  const pricingPlans = plansQuery.data || [];

  return (
    <PageTransition>
      <div className="container py-16">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Simple, Transparent Pricing 💰</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Apne business ke size aur needs ke hisaab se plan choose karo. Start free, upgrade anytime.
            </p>
          </div>
        </ScrollReveal>

        {plansQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="relative">
                <CardHeader className="text-center">
                  <Skeleton className="h-6 w-24 mx-auto" />
                  <div className="mt-2 flex items-baseline justify-center gap-2">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-8">
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
        ) : plansQuery.isError ? (
          <p className="text-center text-muted-foreground">Pricing abhi load nahi ho pa rahi.</p>
        ) : (
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingPlans.map(plan => (
              <StaggerItem key={plan.name}>
                <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}>
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Most Popular</Badge>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-4xl font-bold">₹{plan.price}</span>
                        <span className="text-muted-foreground">/{plan.billingCycle}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                        <Link to="/for-business">{plan.cta}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </div>
    </PageTransition>
  );
}
