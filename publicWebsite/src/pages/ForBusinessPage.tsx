import { Link } from "react-router-dom";
import { Store, TrendingUp, Users, Frown, Smile, ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import { motion } from "framer-motion";
import { getDukandarOnboardingUrl } from "@/lib/dukandarDashboard";

const problems = [
  { icon: Frown, title: "Customers nahi mil rahe?", desc: "Dukaan hai but log jaante nahi. Online presence zero hai." },
  { icon: Frown, title: "Website banana mushkil hai?", desc: "Developer hire karna expensive hai aur time lagta hai." },
  { icon: Frown, title: "WhatsApp pe order manage kaise kare?", desc: "Customers ka message aata hai but organized nahi hai." },
];

const solutions = [
  { icon: Smile, title: "Free Professional Page", desc: "10 minute mein apni shop ka beautiful page banao — koi coding nahi." },
  { icon: Smile, title: "WhatsApp Direct Orders", desc: "Har product pe 'Order on WhatsApp' button. Customers seedha connect." },
  { icon: Smile, title: "Google Pe Dikho", desc: "Apni shop ko Google search mein laao — local SEO built-in." },
];

export default function ForBusinessPage() {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Apni <span className="text-primary">Dukaan</span> Ko Online Lao 🚀
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              India ka #1 local business platform. Free mein start karo, WhatsApp se orders lo, customers badhao.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer")}
              >
                <Store className="h-5 w-5" /> Register Your Shop — Free
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problems */}
      <section className="container py-16">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-center mb-10">Kya Aapki Bhi Yeh Problems Hai? 😟</h2>
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
            <h2 className="text-2xl font-bold text-center mb-10">Hamara Solution ✅</h2>
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
          <h2 className="text-2xl font-bold text-center mb-10">Kitna Kama Sakte Ho? 💰</h2>
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calculator className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">Example: Salon Business</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly customers via DukaanDirect</span><span className="font-medium">50</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Average order value</span><span className="font-medium">₹500</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-semibold">Extra Monthly Revenue</span><span className="font-bold text-primary text-lg">₹25,000</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pro Plan Cost</span><span className="font-medium">-₹499</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-bold">Net Profit</span><span className="font-bold text-primary text-xl">₹24,501/month</span></div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>

      {/* Final CTA */}
      <ScrollReveal>
        <section className="bg-primary py-16">
          <div className="container text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">Ready to Grow? 🌟</h2>
            <p className="text-primary-foreground/80 mb-6">Join 10,000+ local businesses already on DukaanDirect</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer")}
                >
                  Register Now — It's Free
                </Button>
              </motion.div>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/pricing">View Pricing <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </PageTransition>
  );
}
