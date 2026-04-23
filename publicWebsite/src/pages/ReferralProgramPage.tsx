import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function ReferralProgramPage() {
  const { t } = useTranslation();

  return (
    <div className="container py-10 md:py-14 max-w-5xl mx-auto">
      <div className="mx-auto max-w-3xl text-center">
        <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">{t("referralProgramPage.badge")}</Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("referralProgramPage.title")}</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {t("referralProgramPage.subtitle")}
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/account?tab=referrals">{t("referralProgramPage.actions.viewReferrals")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup">{t("referralProgramPage.actions.createCustomer")}</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("referralProgramPage.tip")}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("referralProgramPage.howItWorks.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                {t("referralProgramPage.howItWorks.steps.step1Prefix")} <strong className="text-foreground">{t("referralProgramPage.howItWorks.steps.step1Strong")}</strong> {t("referralProgramPage.howItWorks.steps.step1Suffix")}
              </li>
              <li>{t("referralProgramPage.howItWorks.steps.step2")}</li>
              <li>{t("referralProgramPage.howItWorks.steps.step3")}</li>
              <li>
                {t("referralProgramPage.howItWorks.steps.step4Prefix")} <strong className="text-foreground">{t("referralProgramPage.howItWorks.steps.step4Strong")}</strong>, {t("referralProgramPage.howItWorks.steps.step4Suffix")}
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("referralProgramPage.benefits.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-2">
              <li>{t("referralProgramPage.benefits.items.item1")}</li>
              <li>{t("referralProgramPage.benefits.items.item2")}</li>
              <li>{t("referralProgramPage.benefits.items.item3")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("referralProgramPage.rules.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                {t("referralProgramPage.rules.items.item1Prefix")} <strong className="text-foreground">{t("referralProgramPage.rules.items.item1Strong")}</strong> {t("referralProgramPage.rules.items.item1Suffix")}
              </li>
              <li>{t("referralProgramPage.rules.items.item2")}</li>
              <li>{t("referralProgramPage.rules.items.item3")}</li>
              <li>{t("referralProgramPage.rules.items.item4")}</li>
              <li>{t("referralProgramPage.rules.items.item5")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("referralProgramPage.faq.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="code">
                <AccordionTrigger>{t("referralProgramPage.faq.q1")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t("referralProgramPage.faq.a1Prefix")} <strong className="text-foreground">{t("referralProgramPage.faq.a1Strong")}</strong> {t("referralProgramPage.faq.a1Suffix")}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="payout">
                <AccordionTrigger>{t("referralProgramPage.faq.q2")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t("referralProgramPage.faq.a2")}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="withdraw">
                <AccordionTrigger>{t("referralProgramPage.faq.q3")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t("referralProgramPage.faq.a3Prefix")} <strong className="text-foreground">{t("referralProgramPage.faq.a3Strong")}</strong> {t("referralProgramPage.faq.a3Suffix")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        {t("referralProgramPage.helpPrefix")}{" "}
        <Link to="/contact" className="text-primary hover:underline">{t("referralProgramPage.helpLink")}</Link>{" "}
        {t("referralProgramPage.helpSuffix")}
      </div>
    </div>
  );
}
