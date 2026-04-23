import { useTranslation } from "react-i18next";

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="container py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t("termsPage.title")}</h1>
      <div className="prose text-muted-foreground space-y-4 text-sm">
        <p>
          <strong>{t("termsPage.lastUpdatedLabel")}</strong> {t("termsPage.lastUpdatedValue")}
        </p>

        <h2 className="text-lg font-semibold text-foreground">{t("termsPage.sections.acceptance.title")}</h2>
        <p>{t("termsPage.sections.acceptance.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("termsPage.sections.use.title")}</h2>
        <p>{t("termsPage.sections.use.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("termsPage.sections.responsibilities.title")}</h2>
        <p>{t("termsPage.sections.responsibilities.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("termsPage.sections.ip.title")}</h2>
        <p>{t("termsPage.sections.ip.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("termsPage.sections.liability.title")}</h2>
        <p>{t("termsPage.sections.liability.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("termsPage.sections.contact.title")}</h2>
        <p>
          {t("termsPage.sections.contact.bodyPrefix")} {" "}
          <a href="mailto:legal@publicdukan.in" className="text-primary">
            legal@publicdukan.in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
