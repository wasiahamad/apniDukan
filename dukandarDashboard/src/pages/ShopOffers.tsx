import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Pencil, UploadCloud } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

import { listingApi, offerApi, uploadApi, type Listing, type ShopOffer, type ShopOfferStatus, type ShopOfferType } from "@/lib/api/index";
import { autoHindiText } from "@/i18n";

type OfferFormState = {
  listingId: string;
  title: string;
  description: string;
  type: ShopOfferType;
  status: ShopOfferStatus;
  percentOff: string;
  amountOff: string;
  buyQty: string;
  getQty: string;
  bogoLabel: string;
  bannerImageUrl: string;
  bannerLinkUrl: string;
  validFrom: string;
  validUntil: string;
};

const emptyForm = (): OfferFormState => ({
  listingId: "",
  title: "",
  description: "",
  type: "custom",
  status: "draft",
  percentOff: "",
  amountOff: "",
  buyQty: "1",
  getQty: "1",
  bogoLabel: "",
  bannerImageUrl: "",
  bannerLinkUrl: "",
  validFrom: "",
  validUntil: "",
});

export default function ShopOffers() {
  const { t } = useTranslation();
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferFormState>(() => emptyForm());
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const editingOffer = useMemo(() => offers.find((o) => o._id === editId) || null, [offers, editId]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await offerApi.listMyOffers();
      if (res.success) {
        setOffers(Array.isArray(res.data) ? res.data : []);
      } else {
        toast({
          title: t("shopOffers.errorTitle"),
          description: res.message || t("shopOffers.loadFailed"),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: t("shopOffers.errorTitle"),
        description: err?.message || t("shopOffers.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    setListingsLoading(true);
    try {
      const res = await listingApi.getMyListings(1, 200);
      if (res.success) {
        const items = Array.isArray(res.data?.listings) ? res.data!.listings : [];
        setListings(items.filter((l) => l && l.isActive !== false));
      }
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (offer: ShopOffer) => {
    setEditId(offer._id);
    setForm({
      listingId: offer.listingId || "",
      title: offer.title || "",
      description: offer.description || "",
      type: offer.type || "custom",
      status: offer.status || "draft",
      percentOff: offer.percentOff !== undefined ? String(offer.percentOff) : "",
      amountOff: offer.amountOff !== undefined ? String(offer.amountOff) : "",
      buyQty: offer.bogo?.buyQty !== undefined ? String(offer.bogo.buyQty) : "1",
      getQty: offer.bogo?.getQty !== undefined ? String(offer.bogo.getQty) : "1",
      bogoLabel: offer.bogo?.label || "",
      bannerImageUrl: offer.banner?.imageUrl || "",
      bannerLinkUrl: offer.banner?.linkUrl || "",
      validFrom: offer.validFrom ? offer.validFrom.slice(0, 10) : "",
      validUntil: offer.validUntil ? offer.validUntil.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setOpen(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const handleUploadBanner = async (file: File) => {
    setUploadingBanner(true);
    try {
      const res = await uploadApi.uploadImage(file, "offers");
      if (res.success && res.data?.url) {
        setForm((prev) => ({ ...prev, bannerImageUrl: res.data!.url }));
        toast({ title: t("shopOffers.uploadedTitle"), description: t("shopOffers.bannerUploaded") });
      } else {
        toast({
          title: t("shopOffers.errorTitle"),
          description: res.message || t("shopOffers.uploadFailed"),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: t("shopOffers.errorTitle"),
        description: err?.message || t("shopOffers.uploadFailed"),
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveOffer = async () => {
    if (!form.title.trim()) {
      toast({
        title: t("shopOffers.validationTitle"),
        description: t("shopOffers.titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const title = form.title.trim();
      const titleHi = autoHindiText(title);
      const description = form.description.trim();
      const descriptionHi = description ? autoHindiText(description) : "";

      const payload: any = {
        title,
        titleHi,
        ...(description ? { description } : {}),
        ...(descriptionHi ? { descriptionHi } : {}),
        type: form.type,
        status: form.status,
        ...(form.validFrom ? { validFrom: form.validFrom } : {}),
        ...(form.validUntil ? { validUntil: form.validUntil } : {}),
        banner: {
          ...(form.bannerImageUrl.trim() ? { imageUrl: form.bannerImageUrl.trim() } : {}),
          ...(form.bannerLinkUrl.trim() ? { linkUrl: form.bannerLinkUrl.trim() } : {}),
        },
      };

      if (editId) {
        payload.listingId = form.listingId ? form.listingId : null;
      } else if (form.listingId) {
        payload.listingId = form.listingId;
      }

      if (form.type === "discount_percent") {
        payload.percentOff = form.percentOff === "" ? undefined : Number(form.percentOff);
      }
      if (form.type === "discount_flat") {
        payload.amountOff = form.amountOff === "" ? undefined : Number(form.amountOff);
      }
      if (form.type === "bogo") {
        const bogoLabel = form.bogoLabel.trim();
        const bogoLabelHi = bogoLabel ? autoHindiText(bogoLabel) : "";
        payload.bogo = {
          buyQty: Math.max(1, Number(form.buyQty || 1)),
          getQty: Math.max(1, Number(form.getQty || 1)),
          ...(bogoLabel ? { label: bogoLabel } : {}),
          ...(bogoLabelHi ? { labelHi: bogoLabelHi } : {}),
        };
      }

      if (editId) {
        const res = await offerApi.updateOffer(editId, payload);
        if (res.success && res.data) {
          setOffers((prev) => prev.map((o) => (o._id === editId ? res.data! : o)));
          toast({ title: t("shopOffers.successTitle"), description: t("shopOffers.updated") });
        }
      } else {
        const res = await offerApi.createOffer(payload);
        if (res.success && res.data) {
          setOffers((prev) => [res.data!, ...prev]);
          toast({ title: t("shopOffers.successTitle"), description: t("shopOffers.created") });
        }
      }

      closeDialog();
    } catch (err: any) {
      toast({
        title: t("shopOffers.errorTitle"),
        description: err?.message || t("shopOffers.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!confirm(t("shopOffers.deleteConfirm"))) return;

    try {
      const res = await offerApi.deleteOffer(offerId);
      if (res.success) {
        setOffers((prev) => prev.filter((o) => o._id !== offerId));
        toast({ title: t("shopOffers.successTitle"), description: t("shopOffers.deleted") });
      } else {
        toast({
          title: t("shopOffers.errorTitle"),
          description: res.message || t("shopOffers.deleteFailed"),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: t("shopOffers.errorTitle"),
        description: err?.message || t("shopOffers.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{t("shopOffers.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("shopOffers.pageSubtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("shopOffers.create")}
        </Button>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle>{t("shopOffers.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("shopOffers.empty")}</p>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div
                  key={offer._id}
                  className="flex items-start justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{offer.title}</p>
                      <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {t(`shopOffers.status.${offer.status}`)}
                      </span>
                      <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {t(`shopOffers.type.${offer.type}`)}
                      </span>
                    </div>
                    {offer.description ? (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                    ) : null}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(offer)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {t("common.edit")}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteOffer(offer._id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editId ? t("shopOffers.editTitle") : t("shopOffers.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {editId ? t("shopOffers.editSubtitle") : t("shopOffers.createSubtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.title")}</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={t("shopOffers.fields.titlePlaceholder")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.description")}</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t("shopOffers.fields.descriptionPlaceholder")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.listing")}</label>
              <Select
                value={form.listingId || "__all__"}
                onValueChange={(v) => setForm((p) => ({ ...p, listingId: v === "__all__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("shopOffers.fields.listingPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("shopOffers.fields.listingAll")}</SelectItem>
                  {listingsLoading ? (
                    <SelectItem value="__loading__" disabled>
                      {t("common.loading")}
                    </SelectItem>
                  ) : (
                    listings.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.type")}</label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as ShopOfferType }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("shopOffers.fields.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t("shopOffers.type.custom")}</SelectItem>
                  <SelectItem value="discount_percent">{t("shopOffers.type.discount_percent")}</SelectItem>
                  <SelectItem value="discount_flat">{t("shopOffers.type.discount_flat")}</SelectItem>
                  <SelectItem value="bogo">{t("shopOffers.type.bogo")}</SelectItem>
                </SelectContent>
              </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.status")}</label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as ShopOfferStatus }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("shopOffers.fields.statusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("shopOffers.status.draft")}</SelectItem>
                    <SelectItem value="active">{t("shopOffers.status.active")}</SelectItem>
                    <SelectItem value="paused">{t("shopOffers.status.paused")}</SelectItem>
                    <SelectItem value="archived">{t("shopOffers.status.archived")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === "discount_percent" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.percentOff")}</label>
                <Input type="number" value={form.percentOff} onChange={(e) => setForm((p) => ({ ...p, percentOff: e.target.value }))} />
              </div>
            ) : null}

            {form.type === "discount_flat" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.amountOff")}</label>
                <Input type="number" value={form.amountOff} onChange={(e) => setForm((p) => ({ ...p, amountOff: e.target.value }))} />
              </div>
            ) : null}

            {form.type === "bogo" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.buyQty")}</label>
                  <Input type="number" value={form.buyQty} onChange={(e) => setForm((p) => ({ ...p, buyQty: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.getQty")}</label>
                  <Input type="number" value={form.getQty} onChange={(e) => setForm((p) => ({ ...p, getQty: e.target.value }))} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.bogoLabel")}</label>
                  <Input value={form.bogoLabel} onChange={(e) => setForm((p) => ({ ...p, bogoLabel: e.target.value }))} />
                </div>
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.bannerImage")}</label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.bannerImageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, bannerImageUrl: e.target.value }))}
                  placeholder={t("shopOffers.fields.bannerImagePlaceholder")}
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      handleUploadBanner(f);
                      e.currentTarget.value = "";
                    }}
                    disabled={uploadingBanner}
                  />
                  <Button type="button" variant="outline" disabled={uploadingBanner}>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    {uploadingBanner ? t("shopOffers.uploading") : t("shopOffers.upload")}
                  </Button>
                </label>
              </div>
            </div>

            {form.bannerImageUrl.trim() ? (
              <div>
                <img src={form.bannerImageUrl.trim()} alt="Banner" className="w-full max-h-44 object-cover rounded-xl border" />
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.bannerLink")}</label>
              <Input
                value={form.bannerLinkUrl}
                onChange={(e) => setForm((p) => ({ ...p, bannerLinkUrl: e.target.value }))}
                placeholder={t("shopOffers.fields.bannerLinkPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.validFrom")}</label>
                <Input type="date" value={form.validFrom} onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("shopOffers.fields.validUntil")}</label>
                <Input type="date" value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={saveOffer} disabled={saving || uploadingBanner}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
