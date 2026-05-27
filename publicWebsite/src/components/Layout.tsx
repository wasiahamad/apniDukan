import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import InstallAppBanner from "@/components/pwa/InstallAppBanner";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { Outlet } from "react-router-dom";
import LogoIntro from "./LogoIntro";
import Footer from "./Footer";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <LogoIntro />
      <Header />
      <main className="pb-20 md:pb-0">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <InstallAppBanner />
      <MobileBottomNav />
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>
    </div>
  );
}
