import { Store, Heart, Users, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">About DukaanDirect 🇮🇳</h1>

      <div className="prose prose-lg mx-auto space-y-6 text-muted-foreground">
        <p>
          DukaanDirect is India's growing local business discovery platform, built to bridge the gap between
          neighbourhood shops and digital-savvy customers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose my-8">
          {[
            { icon: Target, title: "Our Mission", desc: "Har local dukaan ko online laana — simple, fast, aur free." },
            { icon: Heart, title: "Our Vision", desc: "India ke 60 million+ small businesses ko digital banane ka sapna." },
            { icon: Users, title: "Our Impact", desc: "10,000+ shops across 5 cities, connecting lakhs of customers." },
            { icon: Store, title: "Our Promise", desc: "Zero technical knowledge needed. 10 minute mein shop live." },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-xl border">
              <item.icon className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p>
          We believe every chai wala, salon owner, kirana store, and tailor deserves the same
          digital tools as big brands. DukaanDirect makes it happen — with WhatsApp-first ordering,
          Google-friendly shop pages, and zero setup cost.
        </p>

        <p className="font-medium text-foreground">
          Built with ❤️ in India, for India's local heroes.
        </p>
      </div>
    </div>
  );
}
