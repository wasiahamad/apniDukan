import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessTypesAdminApi, uploadAdminApi, type BusinessType } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Plus, Power, Save, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";

type FormState = {
  name: string;
  description: string;
  icon: string;
  iconName: string;
  defaultCoverImage: string;
  defaultImages: string[];
  suggestedListingType: "product" | "service" | "food" | "course" | "rental";
  exampleCategoriesText: string;
  whyChooseUsTemplates: Array<{ title: string; desc: string; iconName?: string }>;
  displayOrder: number;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  icon: "",
  iconName: "",
  defaultCoverImage: "",
  defaultImages: [],
  suggestedListingType: "product",
  exampleCategoriesText: "",
  whyChooseUsTemplates: [],
  displayOrder: 0,
  isActive: true,
};

const toExampleCategories = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const normalizeWhyChooseUsTemplates = (raw: unknown): Array<{ title: string; desc: string; iconName?: string }> => {
  if (!Array.isArray(raw)) return [];
  const result: Array<{ title: string; desc: string; iconName?: string }> = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const title = String((item as any)?.title ?? "").trim();
    const desc = String((item as any)?.desc ?? "").trim();
    const iconName = String((item as any)?.iconName ?? "").trim();
    if (!title && !desc) continue;
    const key = `${title.toLowerCase()}|${desc.toLowerCase()}|${iconName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ title, desc, ...(iconName ? { iconName } : {}) });
  }

  return result.slice(0, 12);
};

const normalizeImageList = (raw: unknown, { limit = 12 } = {}): string[] => {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const url = String(item || "").trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(url.slice(0, 500));
    if (out.length >= limit) break;
  }
  return out;
};

export default function BusinessTypes() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BusinessType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const coverFileRef = useRef<HTMLInputElement | null>(null);
  const imagesFileRef = useRef<HTMLInputElement | null>(null);

  const typesQuery = useQuery({
    queryKey: ["admin", "business-types", search, statusFilter],
    queryFn: async () => {
      const res = await businessTypesAdminApi.list({
        search: search.trim() || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      });
      if (!res.success) throw new Error(res.message || "Failed to load business types");
      return res.data || [];
    },
  });

  const types = useMemo(() => {
    const rows = typesQuery.data || [];
    return [...rows].sort((a, b) => {
      const ao = a.displayOrder ?? 0;
      const bo = b.displayOrder ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [typesQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");

      const res = await businessTypesAdminApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        iconName: form.iconName.trim() || undefined,
        defaultCoverImage: form.defaultCoverImage.trim() || undefined,
        defaultImages: normalizeImageList(form.defaultImages),
        suggestedListingType: form.suggestedListingType,
        exampleCategories: toExampleCategories(form.exampleCategoriesText),
        whyChooseUsTemplates: normalizeWhyChooseUsTemplates(form.whyChooseUsTemplates),
        displayOrder: Number.isFinite(form.displayOrder) ? form.displayOrder : 0,
        isActive: form.isActive,
      });
      if (!res.success) throw new Error(res.message || "Failed to create business type");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Business type created");
      qc.invalidateQueries({ queryKey: ["admin", "business-types"] });
      setForm(emptyForm);
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create business type"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing?._id) throw new Error("No business type selected");
      if (!form.name.trim()) throw new Error("Name is required");

      const res = await businessTypesAdminApi.update(editing._id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        iconName: form.iconName.trim() || undefined,
        defaultCoverImage: form.defaultCoverImage.trim(),
        defaultImages: normalizeImageList(form.defaultImages),
        suggestedListingType: form.suggestedListingType,
        exampleCategories: toExampleCategories(form.exampleCategoriesText),
        whyChooseUsTemplates: normalizeWhyChooseUsTemplates(form.whyChooseUsTemplates),
        displayOrder: Number.isFinite(form.displayOrder) ? form.displayOrder : 0,
        isActive: form.isActive,
      });
      if (!res.success) throw new Error(res.message || "Failed to update business type");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Business type updated");
      qc.invalidateQueries({ queryKey: ["admin", "business-types"] });
      setEditing(null);
      setForm(emptyForm);
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update business type"),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!editing?._id) throw new Error('Save the business type first');
      const res = await businessTypesAdminApi.generateWhyChooseUsTemplates(editing._id, { count: 4 });
      if (!res.success) throw new Error(res.message || 'Failed to generate templates');
      return res.data || [];
    },
    onSuccess: (items) => {
      setForm((f) => ({
        ...f,
        whyChooseUsTemplates: normalizeWhyChooseUsTemplates(items),
      }));
      toast.success('Generated Why Choose Us points');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to generate templates'),
  });

  const uploadCoverMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await uploadAdminApi.uploadImage(file, { folder: "apnidukan/business-types" });
      if (!res.success) throw new Error(res.message || "Failed to upload cover image");
      const url = String(res.data?.url || "").trim();
      if (!url) throw new Error("Upload did not return a URL");
      return url;
    },
    onSuccess: (url) => {
      setForm((f) => ({ ...f, defaultCoverImage: url }));
      toast.success("Cover image uploaded");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to upload cover image"),
  });

  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const urls: string[] = [];
      for (const file of files) {
        const res = await uploadAdminApi.uploadImage(file, { folder: "apnidukan/business-types" });
        if (!res.success) throw new Error(res.message || "Failed to upload image");
        const url = String(res.data?.url || "").trim();
        if (url) urls.push(url);
      }
      return urls;
    },
    onSuccess: (urls) => {
      if (urls.length === 0) return;
      setForm((f) => ({
        ...f,
        defaultImages: normalizeImageList([...(f.defaultImages || []), ...urls]),
      }));
      toast.success("Images uploaded");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to upload images"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await businessTypesAdminApi.deactivate(id);
      if (!res.success) throw new Error(res.message || "Failed to deactivate business type");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Business type deactivated");
      qc.invalidateQueries({ queryKey: ["admin", "business-types"] });
      if (editing?._id) {
        setEditing(null);
        setForm(emptyForm);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to deactivate business type"),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await businessTypesAdminApi.update(id, { isActive: true });
      if (!res.success) throw new Error(res.message || "Failed to activate business type");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Business type activated");
      qc.invalidateQueries({ queryKey: ["admin", "business-types"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to activate business type"),
  });

  const startEdit = (bt: BusinessType) => {
    setEditing(bt);
    setForm({
      name: bt.name || "",
      description: bt.description || "",
      icon: bt.icon || "",
      iconName: bt.iconName || "",
      defaultCoverImage: String(bt.defaultCoverImage || ""),
      defaultImages: normalizeImageList(bt.defaultImages || []),
      suggestedListingType: bt.suggestedListingType || "product",
      exampleCategoriesText: (bt.exampleCategories || []).join(", "),
      whyChooseUsTemplates: normalizeWhyChooseUsTemplates(bt.whyChooseUsTemplates),
      displayOrder: bt.displayOrder ?? 0,
      isActive: bt.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const renderBusinessTypeIcon = (bt: BusinessType) => {
    const name = String(bt.iconName || "").trim();
    const IconComp = name ? (LucideIcons as any)[name] : null;
    if (typeof IconComp === "function") {
      return <IconComp className="h-4 w-4" />;
    }
    return <span className="text-base">{bt.icon || "🏪"}</span>;
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const onSave = () => {
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Types</h1>
          <p className="text-sm text-muted-foreground">Create, edit, activate/deactivate business categories</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Business Type
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : cancelEdit())}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Business Type" : "Add Business Type"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kirana Store"
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder='e.g. "🏪" or icon URL'
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Icon Name</Label>
              <Input
                value={form.iconName}
                onChange={(e) => setForm((f) => ({ ...f, iconName: e.target.value }))}
                placeholder='e.g. Store, Utensils, GraduationCap'
              />
              <p className="text-xs text-muted-foreground">
                Optional. If set, the list will render the matching Lucide icon.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Suggested Listing Type</Label>
              <Select
                value={form.suggestedListingType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, suggestedListingType: v as FormState["suggestedListingType"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))}
                min={0}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Example Categories</Label>
              <Input
                value={form.exampleCategoriesText}
                onChange={(e) => setForm((f) => ({ ...f, exampleCategoriesText: e.target.value }))}
                placeholder="Comma-separated, e.g. Rice, Atta, Snacks"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Default Cover Image</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadCoverMutation.isPending}
                  onClick={() => coverFileRef.current?.click()}
                >
                  Upload
                </Button>
              </div>
              <Input
                value={form.defaultCoverImage}
                onChange={(e) => setForm((f) => ({ ...f, defaultCoverImage: e.target.value }))}
                placeholder="Cover image URL (optional)"
              />
              <input
                ref={coverFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  uploadCoverMutation.mutate(file);
                }}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Default Images (Gallery)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadImagesMutation.isPending}
                  onClick={() => imagesFileRef.current?.click()}
                >
                  Upload
                </Button>
              </div>

              {form.defaultImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No default images.</p>
              ) : (
                <div className="space-y-2">
                  {form.defaultImages.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="flex items-center gap-2">
                      <Input value={url} readOnly />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            defaultImages: f.defaultImages.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={imagesFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (files.length === 0) return;
                  uploadImagesMutation.mutate(files);
                }}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Why Choose Us (Defaults)</Label>
                <div className="flex items-center gap-2">
                  {editing?._id ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={generateMutation.isPending}
                      onClick={() => generateMutation.mutate()}
                    >
                      Generate with AI
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        whyChooseUsTemplates: [...f.whyChooseUsTemplates, { title: "", desc: "", iconName: "" }],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Point
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {form.whyChooseUsTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No default points. New shops will start empty.</p>
                ) : (
                  form.whyChooseUsTemplates.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-3">
                      <div className="space-y-2">
                        <Label>Icon Name</Label>
                        <Input
                          value={String((item as any).iconName || "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...f.whyChooseUsTemplates];
                              next[idx] = { ...next[idx], iconName: v };
                              return { ...f, whyChooseUsTemplates: next };
                            });
                          }}
                          placeholder="e.g. Truck, Award, Leaf"
                        />

                        <Label>Title</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...f.whyChooseUsTemplates];
                              next[idx] = { ...next[idx], title: v };
                              return { ...f, whyChooseUsTemplates: next };
                            });
                          }}
                          placeholder="e.g. Fresh & Quality"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>Description</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                whyChooseUsTemplates: f.whyChooseUsTemplates.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={item.desc}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...f.whyChooseUsTemplates];
                              next[idx] = { ...next[idx], desc: v };
                              return { ...f, whyChooseUsTemplates: next };
                            });
                          }}
                          placeholder="Short line (optional)"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <Switch
                id="bt-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="bt-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelEdit}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={onSave} disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">All Business Types</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-64">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name / slug…"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden md:table-cell">Suggested</TableHead>
                  <TableHead className="hidden lg:table-cell">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typesQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-6 rounded" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-24 md:hidden" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : types.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      No business types found
                    </TableCell>
                  </TableRow>
                ) : (
                  types.map((bt) => {
                    const active = bt.isActive ?? true;
                    return (
                      <TableRow key={bt._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {renderBusinessTypeIcon(bt)}
                            <div>
                              <p className="font-medium text-sm">{bt.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{bt.slug || "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{bt.slug || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{bt.suggestedListingType || "product"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{bt.displayOrder ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(bt)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {active ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateMutation.mutate(bt._id)}
                                disabled={deactivateMutation.isPending}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => activateMutation.mutate(bt._id)}
                                disabled={activateMutation.isPending}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
