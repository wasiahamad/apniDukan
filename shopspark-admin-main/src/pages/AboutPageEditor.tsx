import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { aboutAdminApi, type AdminAboutPageContent } from "@/lib/api";

const fallback: AdminAboutPageContent = {
  heading: "About publicdukan 🇮🇳",
  intro:
    "publicdukan is India's growing local business discovery platform, built to bridge the gap between neighbourhood shops and digital-savvy customers.",
  cards: [
    { title: "Our Mission", desc: "Har local dukaan ko online laana — simple, fast, aur free." },
    { title: "Our Vision", desc: "India ke 60 million+ small businesses ko digital banane ka sapna." },
    { title: "Our Impact", desc: "10,000+ shops across 5 cities, connecting lakhs of customers." },
    { title: "Our Promise", desc: "Zero technical knowledge needed. 10 minute mein shop live." },
  ],
  body:
    "We believe every chai wala, salon owner, kirana store, and tailor deserves the same digital tools as big brands. publicdukan makes it happen — with WhatsApp-first ordering, Google-friendly shop pages, and zero setup cost.",
  closing: "Built with ❤️ in India, for India's local heroes.",
};

export default function AboutPageEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AdminAboutPageContent>(fallback);

  const normalizedCards = useMemo(() => {
    const cards = Array.isArray(form.cards) ? form.cards : [];
    const padded = [...cards];
    while (padded.length < 4) padded.push({ title: "", desc: "" });
    return padded.slice(0, 4);
  }, [form.cards]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await aboutAdminApi.get();
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load about page");
      setForm({
        heading: res.data.heading || fallback.heading,
        intro: res.data.intro || fallback.intro,
        cards: Array.isArray(res.data.cards) && res.data.cards.length ? res.data.cards.slice(0, 4) : fallback.cards,
        body: res.data.body || fallback.body,
        closing: res.data.closing || fallback.closing,
      });
    } catch (e: any) {
      setError(e.message || "Failed to load about page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCard = (idx: number, field: "title" | "desc", value: string) => {
    setForm((p) => {
      const cards = Array.isArray(p.cards) ? [...p.cards] : [];
      while (cards.length < 4) cards.push({ title: "", desc: "" });
      cards[idx] = { ...cards[idx], [field]: value };
      return { ...p, cards };
    });
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");
      const payload: AdminAboutPageContent = {
        heading: String(form.heading || "").trim(),
        intro: String(form.intro || "").trim(),
        cards: normalizedCards.map((c) => ({ title: String(c.title || "").trim(), desc: String(c.desc || "").trim() })),
        body: String(form.body || "").trim(),
        closing: String(form.closing || "").trim(),
      };
      const res = await aboutAdminApi.update(payload);
      if (!res.success || !res.data) throw new Error(res.message || "Failed to save about page");
      setForm(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to save about page");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">About Page</h1>
        <p className="text-sm text-muted-foreground">Edit content shown at /about</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Heading</Label>
                <Input value={form.heading} onChange={(e) => setForm((p) => ({ ...p, heading: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Intro</Label>
                <Textarea value={form.intro} onChange={(e) => setForm((p) => ({ ...p, intro: e.target.value }))} rows={3} />
              </div>

              <div className="space-y-3">
                <Label>Highlight Cards (4)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {normalizedCards.map((c, idx) => (
                    <div key={idx} className="border rounded-xl p-4 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Card {idx + 1} Title</Label>
                        <Input value={c.title} onChange={(e) => setCard(idx, "title", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Card {idx + 1} Description</Label>
                        <Textarea value={c.desc} onChange={(e) => setCard(idx, "desc", e.target.value)} rows={2} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Closing Line</Label>
                <Input value={form.closing} onChange={(e) => setForm((p) => ({ ...p, closing: e.target.value }))} />
              </div>

              <div className="flex gap-2">
                <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                <Button variant="outline" onClick={load} disabled={saving}>Refresh</Button>
              </div>

              {error ? <div className="text-sm text-destructive">{error}</div> : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
