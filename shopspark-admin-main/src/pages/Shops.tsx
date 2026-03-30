import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { businessAdminApi, type Business } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Shops() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const businessesQuery = useQuery({
    queryKey: ["admin", "business", "list"],
    queryFn: async () => {
      const res = await businessAdminApi.list({ page: 1, limit: 200 });
      if (!res.success) throw new Error(res.message || 'Failed to load businesses');
      return res.data?.businesses || [];
    },
  });

  const businesses = businessesQuery.data || [];

  const deriveStatus = (b: Business) => {
    if (!b.isActive) return 'suspended';
    if (!b.isVerified) return 'inactive';
    return 'active';
  };

  const cities = [...new Set(businesses.map(s => s.address?.city).filter(Boolean) as string[])];

  const filtered = businesses.filter((b) => {
    const haystack = [b.name, b.owner?.name, b.owner?.email, b.phone].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !search.trim() || haystack.includes(search.toLowerCase());

    const status = deriveStatus(b);
    const matchStatus = statusFilter === 'all' || status === statusFilter;

    const matchCity = cityFilter === 'all' || (b.address?.city || '') === cityFilter;
    return matchSearch && matchStatus && matchCity;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shop Management</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} shops found</p>
        </div>
        <Button size="sm" onClick={() => navigate("/shops/new")}>+ Add New Shop</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search shops..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">City</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessesQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-44" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">No shops found</TableCell>
                  </TableRow>
                ) : filtered.map(b => (
                  <TableRow key={b._id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/shops/${b._id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{b.owner?.name || '—'}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{b.phone}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{b.address?.city || '—'}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{b.businessType?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{b.plan?.name || '—'}</TableCell>
                    <TableCell><StatusBadge status={deriveStatus(b)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/shops/${b._id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <LogIn className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
