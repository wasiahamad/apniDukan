import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin } from "lucide-react";

import { customersAdminApi, type AdminCustomer } from "@/lib/api/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 20;

const formatCoord = (value: number) => (Number.isFinite(value) ? value.toFixed(5) : "N/A");

export default function Customers() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const customersQuery = useQuery({
    queryKey: ["admin", "customers", page, search],
    queryFn: async () => {
      const res = await customersAdminApi.list({ page, limit: PAGE_SIZE, search: search.trim() || undefined });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load customers");
      return res.data;
    },
  });

  const customers = customersQuery.data?.customers || [];
  const pagination = customersQuery.data?.pagination;

  const locationCoverage = useMemo(() => {
    if (!customers.length) return "0";
    const withLocation = customers.filter((c) => Array.isArray(c.currentLocation?.coordinates)).length;
    return `${withLocation}/${customers.length}`;
  }, [customers]);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const renderLocation = (customer: AdminCustomer) => {
    const coords = customer.currentLocation?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return <span className="text-muted-foreground">Not set</span>;
    }

    const lat = Number(coords[1]);
    const lng = Number(coords[0]);
    const capturedAt = customer.currentLocation?.capturedAt
      ? new Date(customer.currentLocation.capturedAt).toLocaleString("en-IN")
      : "-";

    return (
      <div className="text-xs space-y-1">
        <p className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {formatCoord(lat)}, {formatCoord(lng)}
        </p>
        <p className="text-muted-foreground">Synced: {capturedAt}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Total: {pagination?.total ?? 0} • Location synced: {locationCoverage}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
              />
            </div>
            <Button onClick={applySearch}>Apply</Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{c.name || "-"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c._id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{c.email || "-"}</p>
                          <p className="text-muted-foreground">{c.phone || "No phone"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={c.isActive === false ? "destructive" : "secondary"}>
                            {c.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                          <Badge variant={c.isEmailVerified ? "default" : "outline"}>
                            {c.isEmailVerified ? "Email Verified" : "Email Pending"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{renderLocation(c)}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <p>Total: {c.bookingStats?.totalBookings ?? 0}</p>
                          <p className="text-muted-foreground">Active: {c.bookingStats?.activeBookings ?? 0} • Done: {c.bookingStats?.completedBookings ?? 0}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {customersQuery.isError ? (
            <p className="text-sm text-destructive">{(customersQuery.error as Error)?.message || "Failed to load customers"}</p>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(pagination?.page ?? page) <= 1 || customersQuery.isFetching}
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={Boolean(pagination && pagination.page >= pagination.pages) || customersQuery.isFetching}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
