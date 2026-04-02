import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessAdminApi, type Business } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ExternalLink, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subdomains() {
  const [search, setSearch] = useState("");
  const businessesQuery = useQuery({
    queryKey: ["admin", "business", "list", "subdomains"],
    queryFn: async () => {
      const res = await businessAdminApi.list({ page: 1, limit: 500 });
      if (!res.success) throw new Error(res.message || "Failed to load subdomains");
      return res.data?.businesses || [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const deriveStatus = (b: Business): "active" | "inactive" | "suspended" => {
    if (b.effectiveEntitlements?.subdomainStatus) {
      return b.effectiveEntitlements.subdomainStatus;
    }
    const publicShopEnabled = b.effectiveEntitlements?.publicShopEnabled === true;
    const planIsActive = b.effectiveEntitlements?.planIsActive === true;
    const storefrontActive = b.effectiveEntitlements?.storefrontActive === true;
    if (!b.isActive) return "suspended";
    if (!b.isVerified) return "inactive";
    if (!planIsActive) return "inactive";
    if (!publicShopEnabled) return "inactive";
    if (!storefrontActive) return "inactive";
    return "active";
  };

  const getStatusReason = (b: Business) => {
    if (b.effectiveEntitlements?.subdomainReason) {
      return b.effectiveEntitlements.subdomainReason;
    }
    const publicShopEnabled = b.effectiveEntitlements?.publicShopEnabled === true;
    const planIsActive = b.effectiveEntitlements?.planIsActive === true;
    const entitlementSource = b.effectiveEntitlements?.source || "defaults";

    if (!b.isActive) return "Shop disabled by admin";
    if (!b.isVerified) return "Verification pending";
    if (!planIsActive) return "Plan expired";
    if (!publicShopEnabled) {
      if (entitlementSource === "plan") return "Current plan does not allow public shop";
      if (entitlementSource === "fallback") return "Fallback plan does not allow public shop";
      return "Public shop disabled by feature rules";
    }
    return "Live and reachable";
  };

  const storefrontBase = String(import.meta.env.VITE_STOREFRONT_URL || "http://localhost:8080").trim();
  const normalizedStorefrontBase = /^(https?:)?\/\//i.test(storefrontBase)
    ? storefrontBase.replace(/\/\/+$/, "")
    : `http://${storefrontBase.replace(/\/\/+$/, "")}`;

  const storefrontHost = (() => {
    try {
      return new URL(normalizedStorefrontBase).host;
    } catch {
      return normalizedStorefrontBase;
    }
  })();

  const toSlug = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const getShopPublicUrl = (shop: { slug?: string; name?: string }) => {
    const slug = toSlug(shop.slug || "") || toSlug(shop.name || "");
    return `${normalizedStorefrontBase}/shop/${slug}`;
  };

  const businesses = businessesQuery.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => {
      const haystack = [
        b.name,
        b.slug,
        b.owner?.name,
        b.owner?.email,
        b.address?.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [businesses, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subdomain Management</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} subdomains configured • Base: {storefrontHost}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => businessesQuery.refetch()}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subdomains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Public URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Why</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessesQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : businessesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    {businessesQuery.error instanceof Error ? businessesQuery.error.message : "Failed to load subdomains"}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No subdomains found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((shop) => {
                  const publicUrl = getShopPublicUrl(shop);
                  const status = deriveStatus(shop);
                  const reason = getStatusReason(shop);
                  const canOpenPublicUrl = status === "active";

                  return (
                    <TableRow key={shop._id}>
                      <TableCell className="font-medium text-sm">
                        <div>
                          <p>{shop.name}</p>
                          <p className="text-xs text-muted-foreground">{shop.owner?.name || "No owner"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-primary">{shop.slug}</TableCell>
                      <TableCell className="text-sm break-all">{publicUrl}</TableCell>
                      <TableCell><StatusBadge status={status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{reason}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!canOpenPublicUrl}
                          title={canOpenPublicUrl ? "Open public URL" : "Public URL is disabled for this shop"}
                          onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
