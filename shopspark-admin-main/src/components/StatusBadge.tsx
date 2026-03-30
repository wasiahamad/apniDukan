import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  inactive: "bg-muted/50 text-muted-foreground border-border",
  new: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-accent text-accent-foreground border-accent",
  out_for_delivery: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  delivered: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  open: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  resolved: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  closed: "bg-muted/50 text-muted-foreground border-border",
  available: "bg-primary/10 text-primary border-primary/20",
  busy: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  offline: "bg-muted/50 text-muted-foreground border-border",
  indexed: "bg-primary/10 text-primary border-primary/20",
  not_indexed: "bg-destructive/10 text-destructive border-destructive/20",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <Badge variant="outline" className={`text-xs font-medium capitalize ${statusStyles[status] || ""}`}>
      {label}
    </Badge>
  );
}
