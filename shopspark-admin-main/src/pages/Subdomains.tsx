import { useState } from "react";
import { mockShops } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Globe, Plus, ExternalLink, Shield, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function Subdomains() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState("");
  const [selectedShop, setSelectedShop] = useState("");

  const filtered = mockShops.filter(s =>
    s.businessName.toLowerCase().includes(search.toLowerCase()) ||
    s.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newSubdomain || !selectedShop) return;
    toast({ title: "Subdomain Created", description: `${newSubdomain}.localbooster.in assigned successfully.` });
    setDialogOpen(false);
    setNewSubdomain("");
    setSelectedShop("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subdomain Management</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} subdomains configured</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create Subdomain</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Subdomain</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Select Shop</Label>
                <Select value={selectedShop} onValueChange={setSelectedShop}>
                  <SelectTrigger><SelectValue placeholder="Choose a shop" /></SelectTrigger>
                  <SelectContent>
                    {mockShops.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.businessName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input value={newSubdomain} onChange={e => setNewSubdomain(e.target.value)} placeholder="shopname" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.localbooster.in</span>
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate}>Create Subdomain</Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <TableHead>Custom Domain</TableHead>
                <TableHead>SSL</TableHead>
                <TableHead>Indexing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(shop => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium text-sm">{shop.businessName}</TableCell>
                  <TableCell className="text-sm font-mono text-primary">{shop.subdomain}</TableCell>
                  <TableCell className="text-sm">{shop.customDomain || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Shield className={`h-3.5 w-3.5 ${shop.sslStatus === "active" ? "text-primary" : "text-destructive"}`} />
                      <span className="text-xs capitalize">{shop.sslStatus}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs capitalize">{shop.googleIndexing.replace("_", " ")}</span></TableCell>
                  <TableCell><StatusBadge status={shop.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`https://${shop.subdomain}`, "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
