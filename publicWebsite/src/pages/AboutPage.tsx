import { useEffect, useMemo, useState } from "react";
import { Store, Heart, Users, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchAboutPageContent, type AboutPageContent } from "@/lib/publicShopsApi";

const looksLikeHindi = (value: string) => /[\u0900-\u097F]/.test(value);

export default function AboutPage() {
  const { t, i18n } = useTranslation();

  const fallback = useMemo<AboutPageContent>(
    () => ({
      heading: t("aboutPage.heading"),
      intro: t("aboutPage.intro"),
      cards: [
        { title: t("aboutPage.cards.mission.title"), desc: t("aboutPage.cards.mission.desc") },
        { title: t("aboutPage.cards.vision.title"), desc: t("aboutPage.cards.vision.desc") },
        { title: t("aboutPage.cards.impact.title"), desc: t("aboutPage.cards.impact.desc") },
        { title: t("aboutPage.cards.promise.title"), desc: t("aboutPage.cards.promise.desc") },
      ],
      body: t("aboutPage.body"),
      closing: t("aboutPage.closing"),
    }),
    [t, i18n.language]
  );

  const [content, setContent] = useState<AboutPageContent>(fallback);

  useEffect(() => {
    setContent(fallback);
  }, [fallback]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchAboutPageContent(i18n.language);

        const merged: AboutPageContent = {
          heading: c.heading || fallback.heading,
          intro: c.intro || fallback.intro,
          cards: Array.isArray(c.cards) && c.cards.length ? c.cards.slice(0, 4) : fallback.cards,
          body: c.body || fallback.body,
          closing: c.closing || fallback.closing,
        };

        const joined = [merged.heading, merged.intro, merged.body, merged.closing, ...merged.cards.flatMap((x) => [x.title, x.desc])].join(" ");
        const acceptRemote = i18n.language === "en" ? true : looksLikeHindi(joined);

        if (!cancelled && acceptRemote) setContent(merged);
      } catch {
        // keep fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback, i18n.language]);

  return (
    <div className="container py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">{content.heading}</h1>

      <div className="prose prose-lg mx-auto space-y-6 text-muted-foreground">
        <p>{content.intro}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose my-8">
          {content.cards
            .slice(0, 4)
            .map((item, i) => {
              const icon = [Target, Heart, Users, Store][i] || Target;
              return { icon, title: item.title, desc: item.desc };
            })
            .map((item, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border">
                <item.icon className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
        </div>

        <p>{content.body}</p>

        <p className="font-medium text-foreground">{content.closing}</p>
      </div>
    </div>
  );
}
