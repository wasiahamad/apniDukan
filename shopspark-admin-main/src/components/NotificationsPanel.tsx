import { Bell, ShoppingCart, CreditCard, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notifications = [
  { id: 1, type: "order", icon: ShoppingCart, title: "New Order #ORD-00031", desc: "Sharma General Store - ₹1,200", time: "2 min ago" },
  { id: 2, type: "order", icon: ShoppingCart, title: "New Order #ORD-00032", desc: "Patel Electronics - ₹3,500", time: "15 min ago" },
  { id: 3, type: "subscription", icon: CreditCard, title: "Subscription Expiring", desc: "Fashion Hub - expires in 3 days", time: "1 hr ago" },
  { id: 4, type: "subscription", icon: CreditCard, title: "Payment Overdue", desc: "Royal Hardware - ₹1,999 pending", time: "2 hrs ago" },
  { id: 5, type: "ticket", icon: HeadphonesIcon, title: "New Support Ticket", desc: "MedPlus Pharmacy - Website Down", time: "3 hrs ago" },
  { id: 6, type: "ticket", icon: HeadphonesIcon, title: "Ticket Escalated", desc: "Gupta Sweets - Payment Issue", time: "5 hrs ago" },
];

const typeColors: Record<string, string> = {
  order: "text-primary",
  subscription: "text-chart-4",
  ticket: "text-destructive",
};

export function NotificationsPanel() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
            {notifications.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary">Mark all read</Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <DropdownMenuItem key={n.id} className="flex items-start gap-3 p-3 cursor-pointer">
              <div className={`mt-0.5 ${typeColors[n.type]}`}>
                <n.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm text-primary cursor-pointer">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
