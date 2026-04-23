import { useTranslation } from "react-i18next";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="container py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t("privacyPolicyPage.title")}</h1>
      <div className="prose text-muted-foreground space-y-4 text-sm">
        <p>
          <strong>{t("privacyPolicyPage.lastUpdatedLabel")}</strong> {t("privacyPolicyPage.lastUpdatedValue")}
        </p>

        <h2 className="text-lg font-semibold text-foreground">{t("privacyPolicyPage.sections.collect.title")}</h2>
        <p>{t("privacyPolicyPage.sections.collect.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("privacyPolicyPage.sections.use.title")}</h2>
        <p>{t("privacyPolicyPage.sections.use.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("privacyPolicyPage.sections.sharing.title")}</h2>
        <p>{t("privacyPolicyPage.sections.sharing.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("privacyPolicyPage.sections.security.title")}</h2>
        <p>{t("privacyPolicyPage.sections.security.body")}</p>

        <h2 className="text-lg font-semibold text-foreground">{t("privacyPolicyPage.sections.contact.title")}</h2>
        <p>
          {t("privacyPolicyPage.sections.contact.bodyPrefix")} {" "}
          <a href="mailto:privacy@publicdukan.in" className="text-primary">
            privacy@publicdukan.in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
