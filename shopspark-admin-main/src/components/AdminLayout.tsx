import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Outlet } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shops, orders..."
                  className="pl-9 w-64 h-9 bg-background"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationsPanel />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
