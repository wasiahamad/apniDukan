import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const logs = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  adminId: ["ADMIN-001", "ADMIN-002", "ADMIN-003"][i % 3],
  action: ["Updated shop status", "Changed subscription plan", "Assigned delivery", "Cancelled order", "Closed ticket"][i % 5],
  target: ["SHOP-0001", "ORD-00003", "TKT-0002", "SHOP-0012", "INV-00005"][i % 5],
  targetType: ["Shop", "Order", "Ticket", "Shop", "Invoice"][i % 5],
  timestamp: new Date(2025, 1, 10, 14 - i, 30).toISOString(),
}));

export default function AuditLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">All admin actions are logged</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.id}</TableCell>
                  <TableCell className="font-mono text-xs">{log.adminId}</TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="font-mono text-xs">{log.target}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{log.targetType}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
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
