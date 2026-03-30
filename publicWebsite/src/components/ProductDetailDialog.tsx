import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/data/mockData";

interface ProductDetailDialogProps {
  product: Product | null;
  shopWhatsapp: string;
  shopName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductDetailDialog({
  product,
  shopWhatsapp,
  shopName,
  open,
  onOpenChange,
}: ProductDetailDialogProps) {
  if (!product) return null;

  const trackAction = async (action: "whatsapp" | "call" | "map") => {
    try {
      // shopName isn't unique; we track by whatsapp number isn't stable either.
      // In this dialog, slug isn't available, so we skip tracking here.
      // (Tracking is handled on ShopPage WhatsApp button.)
      void action;
    } catch {
      // ignore
    }
  };

  const parseMaybePrice = (value: string | number) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const images = useMemo(() => {
    const maybeImages = (product as Product & { images?: string[] }).images;
    const fromArray = Array.isArray(maybeImages) ? maybeImages.filter(Boolean) : [];
    const fromSingle = product.image ? [product.image] : [];
    return (fromArray.length > 0 ? fromArray : fromSingle).filter(Boolean);
  }, [product]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product, open]);

  const typeLabel =
    product.type === "service"
      ? "Service"
      : product.type === "food"
        ? "Food"
        : product.type === "course"
          ? "Course"
          : product.type === "rental"
            ? "Rental"
            : "Product";
  const attrs = Array.isArray(product.attributes) ? product.attributes : [];
  const hasDetails = Boolean(product.duration || product.type || attrs.length > 0);

  const selectableOptions = useMemo(() => {
    const direct = Array.isArray(product.pricingOptions) ? product.pricingOptions : [];
    const directOptions = direct
      .map((o) => ({ name: String(o?.label || "").trim(), price: Number(o?.price) }))
      .filter((o) => o.name && Number.isFinite(o.price) && o.price >= 0);
    if (directOptions.length > 0) return directOptions;

    // Backward-compat: food listings might have price options encoded as attributes.
    if (product.type !== "food") return [] as { name: string; price: number }[];
    return attrs
      .map((a) => ({ name: String(a?.name || "").trim(), price: parseMaybePrice(a?.value) }))
      .filter((o) => o.name && o.price !== null)
      .map((o) => ({ name: o.name, price: o.price as number }));
  }, [attrs, product.pricingOptions, product.type]);

  const detailsAttributes = useMemo(() => {
    const hasDirectPricingOptions = Array.isArray(product.pricingOptions) && product.pricingOptions.length > 0;
    if (hasDirectPricingOptions) return attrs;

    const optionNames = new Set(selectableOptions.map((o) => o.name));
    return attrs.filter((a) => !optionNames.has(String(a?.name || "").trim()));
  }, [attrs, product.pricingOptions, selectableOptions]);

  const [selectedOptionName, setSelectedOptionName] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (selectableOptions.length === 0) {
      setSelectedOptionName("");
      return;
    }
    setSelectedOptionName((prev) => prev || selectableOptions[0].name);
  }, [open, selectableOptions]);

  const selectedOption = useMemo(() => {
    if (!selectedOptionName) return null;
    return selectableOptions.find((o) => o.name === selectedOptionName) || null;
  }, [selectableOptions, selectedOptionName]);

  const effectivePrice = selectedOption?.price ?? product.price;
  const requiresSelection = selectableOptions.length > 0;
  const canOrder = !requiresSelection || !!selectedOption;

  const whatsappHref = useMemo(() => {
    const parts = [
      `Hi, I want to order ${product.name} (₹${effectivePrice}) from ${shopName} via DukaanDirect`,
      selectedOption ? `Option: ${selectedOption.name}` : null,
    ].filter(Boolean);
    return `https://wa.me/${shopWhatsapp}?text=${encodeURIComponent(parts.join("\n"))}`;
  }, [effectivePrice, product.name, selectedOption, shopName, shopWhatsapp]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-xs font-semibold text-muted-foreground">{typeLabel}</div>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="text-muted-foreground text-sm">No image</div>
              )}
            </div>

            {images.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto">
                {images.map((src, idx) => {
                  const active = idx === selectedImageIndex;
                  return (
                    <button
                      key={`thumb-${src}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border ${
                        active ? "border-primary" : "border-border"
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={src} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary">₹{effectivePrice}</p>
            <div className="text-sm text-muted-foreground">Sold by {shopName}</div>
            {product.type && <Badge variant="secondary">{typeLabel}</Badge>}
          </div>

          {product.description && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-2">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {selectableOptions.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-3">Choose option</h2>
              <div className="space-y-2">
                {selectableOptions.map((opt) => {
                  const active = opt.name === selectedOptionName;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setSelectedOptionName(opt.name)}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm font-semibold text-foreground">{opt.name}</span>
                      <span className="text-sm font-bold text-foreground">₹{opt.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasDetails && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-2">Details</h2>
              <div className="space-y-2">
                {detailsAttributes.map((a, idx) => (
                  <div key={`${a.name}-${idx}`} className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{a.name}</div>
                    <div className="text-sm font-semibold text-right">{String(a.value)}</div>
                  </div>
                ))}
                {product.duration && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="text-sm font-semibold text-right inline-flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{product.duration}</span>
                    </div>
                  </div>
                )}
                {product.type && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="text-sm font-semibold text-right">{typeLabel}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button className="w-full gap-2" asChild disabled={!canOrder}>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!canOrder}
              onClick={() => trackAction("whatsapp")}
            >
              <MessageCircle className="h-4 w-4" /> Order on WhatsApp
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
