import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { autoHindiText, hasDevanagari } from "@/lib/publicShopsApi";
import { hasAuthSession } from "@/lib/publicShopsApi";
import { createPublicOrder } from "@/lib/ordersApi";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/data/mockData";

interface ProductDetailDialogProps {
  product: Product | null;
  businessId: string;
  shopSlug: string;
  customerName?: string;
  customerPhone?: string;
  shopWhatsapp: string;
  shopName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook?: (product: Product) => void;
  onRequireLogin?: (product: Product) => void;
}

export default function ProductDetailDialog({
  product,
  businessId,
  shopSlug,
  customerName,
  customerPhone,
  shopWhatsapp,
  shopName,
  open,
  onOpenChange,
  onBook,
  onRequireLogin,
}: ProductDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Important: do NOT early-return before hooks below; otherwise React will throw
  // "Rendered more hooks than during the previous render" when product becomes non-null.
  const dialogOpen = open && !!product;
  const safeProduct: Product =
    product || ({ id: "", name: "", price: 0, image: "" } satisfies Product);

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
    const maybeImages = (safeProduct as Product & { images?: string[] }).images;
    const fromArray = Array.isArray(maybeImages) ? maybeImages.filter(Boolean) : [];
    const fromSingle = safeProduct.image ? [safeProduct.image] : [];
    return (fromArray.length > 0 ? fromArray : fromSingle).filter(Boolean);
  }, [safeProduct.image, product]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product, dialogOpen]);

  const typeLabel =
    safeProduct.type === "service"
      ? t("shopPage.listingType.service")
      : safeProduct.type === "food"
        ? t("shopPage.listingType.food")
        : safeProduct.type === "course"
          ? t("shopPage.listingType.course")
          : safeProduct.type === "rental"
            ? t("shopPage.listingType.rental")
            : t("shopPage.listingType.product");
  const attrs = Array.isArray(safeProduct.attributes) ? safeProduct.attributes : [];
  const hasDetails = Boolean(safeProduct.duration || safeProduct.type || attrs.length > 0);

  const canBook = useMemo(() => {
    return !!onBook;
  }, [onBook]);

  const selectableOptions = useMemo(() => {
    const direct = Array.isArray(safeProduct.pricingOptions) ? safeProduct.pricingOptions : [];
    const directOptions = direct
      .map((o) => {
        const rawOld = Number((o as any)?.oldPrice);
        return {
          name: String((o as any)?.label || "").trim(),
          price: Number((o as any)?.price),
          oldPrice: Number.isFinite(rawOld) && rawOld > 0 ? rawOld : undefined,
          discountPercent: (() => {
            const raw = Number((o as any)?.discountPercent);
            return Number.isFinite(raw) && raw > 0 ? raw : undefined;
          })(),
        };
      })
      .filter((o) => o.name && Number.isFinite(o.price) && o.price >= 0);
    if (directOptions.length > 0) return directOptions;

    // Backward-compat: food listings might have price options encoded as attributes.
    if (safeProduct.type !== "food") return [] as { name: string; price: number }[];
    return attrs
      .map((a) => ({ name: String(a?.name || "").trim(), price: parseMaybePrice(a?.value) }))
      .filter((o) => o.name && o.price !== null)
      .map((o) => ({ name: o.name, price: o.price as number }));
  }, [attrs, safeProduct.pricingOptions, safeProduct.type]);

  const detailsAttributes = useMemo(() => {
    const hasDirectPricingOptions = Array.isArray(safeProduct.pricingOptions) && safeProduct.pricingOptions.length > 0;
    if (hasDirectPricingOptions) return attrs;

    const optionNames = new Set(selectableOptions.map((o) => o.name));
    return attrs.filter((a) => !optionNames.has(String(a?.name || "").trim()));
  }, [attrs, safeProduct.pricingOptions, selectableOptions]);

  const [selectedOptionName, setSelectedOptionName] = useState<string>("");

  useEffect(() => {
    if (!dialogOpen) return;
    if (selectableOptions.length === 0) {
      setSelectedOptionName("");
      return;
    }
    setSelectedOptionName((prev) => prev || selectableOptions[0].name);
  }, [dialogOpen, selectableOptions]);

  const selectedOption = useMemo(() => {
    if (!selectedOptionName) return null;
    return selectableOptions.find((o) => o.name === selectedOptionName) || null;
  }, [selectableOptions, selectedOptionName]);

  const effectivePrice = selectedOption?.price ?? safeProduct.price;
  const effectiveOldPrice = (selectedOption as any)?.oldPrice ?? (safeProduct as any)?.oldPrice;
  const effectiveDiscountPercent = (() => {
    const direct = Number((selectedOption as any)?.discountPercent ?? (safeProduct as any)?.discountPercent);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    const price = Number(effectivePrice);
    const oldPrice = Number(effectiveOldPrice);
    if (!Number.isFinite(price) || !Number.isFinite(oldPrice)) return null;
    if (oldPrice <= price || oldPrice <= 0) return null;
    const computed = Math.round(((oldPrice - price) / oldPrice) * 100);
    return computed > 0 ? computed : null;
  })();
  const requiresSelection = selectableOptions.length > 0;
  const canOrder = !requiresSelection || !!selectedOption;

  const whatsappHref = useMemo(() => {
    const parts = [
      t("shopPage.productDialog.whatsappPrefill", {
        item: safeProduct.name,
        price: effectivePrice,
        shopName,
      }),
      selectedOption
        ? t("shopPage.productDialog.whatsappOptionLine", { option: selectedOption.name })
        : null,
    ].filter(Boolean);
    return `https://wa.me/${shopWhatsapp}?text=${encodeURIComponent(parts.join("\n"))}`;
  }, [effectivePrice, safeProduct.name, selectedOption, shopName, shopWhatsapp]);

  const getLastMapOrigin = (): "map" | "website" => {
    try {
      const raw = sessionStorage.getItem('publicdukan:last_map_click');
      if (!raw) return 'website';
      const parsed = JSON.parse(raw);
      const ts = Number(parsed?.ts);
      const slug = String(parsed?.shopSlug || '').trim();
      if (!Number.isFinite(ts) || !slug) return 'website';
      if (slug !== String(shopSlug || '').trim()) return 'website';
      // Consider map-origin only if within last 10 minutes
      if (Date.now() - ts > 10 * 60 * 1000) return 'website';
      return 'map';
    } catch {
      return 'website';
    }
  };

  const createOrderRecord = async () => {
    const bid = String(businessId || '').trim();
    const listingId = String(safeProduct.id || '').trim();
    if (!bid || !listingId) {
      throw new Error("Missing order details");
    }

    const origin = getLastMapOrigin();

    return createPublicOrder({
      businessId: bid,
      source: 'whatsapp',
      origin,
      items: [
        {
          listingId,
          quantity: 1,
          ...(selectedOption ? { pricingOptionLabel: selectedOption.name } : {}),
        },
      ],
      customer: {
        name: String(customerName || '').trim() || undefined,
        phone: String(customerPhone || '').trim() || undefined,
      },
    });
  };

  const rawDescription = String(safeProduct.description || "");
  const displayDescription =
    i18n.language === "hi" && rawDescription && !hasDevanagari(rawDescription)
      ? (() => {
          const converted = autoHindiText(rawDescription);
          return hasDevanagari(converted)
            ? converted
            : t("shopPage.productDialog.autoDescriptionFallback");
        })()
      : rawDescription;

  if (!product) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-xs font-semibold text-muted-foreground">{typeLabel}</div>
          <DialogTitle>{safeProduct.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]}
                  alt={safeProduct.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="text-muted-foreground text-sm">{t("shopPage.productDialog.noImage")}</div>
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
                      <img src={src} alt={safeProduct.name} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-primary">₹{effectivePrice}</p>
              {(() => {
                const oldPrice = Number(effectiveOldPrice);
                if (!Number.isFinite(oldPrice) || oldPrice <= 0) return null;
                if (oldPrice <= Number(effectivePrice)) return null;
                return <span className="text-sm text-muted-foreground line-through">₹{oldPrice}</span>;
              })()}
              {typeof effectiveDiscountPercent === 'number' && effectiveDiscountPercent > 0 ? (
                <Badge variant="secondary" className="text-[10px]">-{effectiveDiscountPercent}%</Badge>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("shopPage.productDialog.soldBy", { shopName })}
            </div>
            {safeProduct.type && <Badge variant="secondary">{typeLabel}</Badge>}
          </div>

          {rawDescription && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-2">{t("shopPage.productDialog.descriptionTitle")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {displayDescription}
              </p>
            </div>
          )}

          {selectableOptions.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-3">{t("shopPage.productDialog.chooseOptionTitle")}</h2>
              <div className="space-y-2">
                {selectableOptions.map((opt) => {
                  const active = opt.name === selectedOptionName;
                  const optOld = Number((opt as any)?.oldPrice);
                  const showOld = Number.isFinite(optOld) && optOld > 0 && optOld > Number(opt.price);
                  const optPercent = (() => {
                    const direct = Number((opt as any)?.discountPercent);
                    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
                    if (!showOld) return null;
                    const computed = Math.round(((optOld - Number(opt.price)) / optOld) * 100);
                    return computed > 0 ? computed : null;
                  })();
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
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">₹{opt.price}</span>
                        {showOld ? (
                          <span className="text-xs text-muted-foreground line-through">₹{optOld}</span>
                        ) : null}
                        {typeof optPercent === 'number' && optPercent > 0 ? (
                          <Badge variant="secondary" className="text-[10px]">-{optPercent}%</Badge>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasDetails && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-2">{t("shopPage.productDialog.detailsTitle")}</h2>
              <div className="space-y-2">
                {detailsAttributes.map((a, idx) => (
                  <div key={`${a.name}-${idx}`} className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{a.name}</div>
                    <div className="text-sm font-semibold text-right">{String(a.value)}</div>
                  </div>
                ))}
                {safeProduct.duration && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("shopPage.productDialog.durationLabel")}</div>
                    <div className="text-sm font-semibold text-right inline-flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{safeProduct.duration}</span>
                    </div>
                  </div>
                )}
                {safeProduct.type && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("shopPage.productDialog.typeLabel")}</div>
                    <div className="text-sm font-semibold text-right">{typeLabel}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            type="button"
            disabled={!canOrder || placingOrder}
            onClick={async () => {
              if (!canOrder || placingOrder) return;

              if (!hasAuthSession()) {
                toast({
                  title: t("shopPage.auth.loginRequiredTitle"),
                  description: t("shopPage.booking.loginRequiredDesc"),
                  variant: "destructive",
                });
                onOpenChange(false);
                onRequireLogin?.(safeProduct);
                return;
              }

              setPlacingOrder(true);
              try {
                await createOrderRecord();
                trackAction("whatsapp");
                window.open(whatsappHref, "_blank", "noopener,noreferrer");
              } catch (err: any) {
                const msg =
                  i18n.language === "en"
                    ? String(err?.message || t("shopPage.generic.tryAgain"))
                    : t("shopPage.generic.tryAgain");
                toast({
                  title: t("shopPage.booking.failedTitle"),
                  description: msg,
                  variant: "destructive",
                });
              } finally {
                setPlacingOrder(false);
              }
            }}
          >
              <MessageCircle className="h-4 w-4" /> {t("shopPage.productDialog.orderOnWhatsApp")}
          </Button>

          {canBook ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                onBook?.(safeProduct);
              }}
            >
              {t("shopPage.productDialog.bookAppointment")}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
