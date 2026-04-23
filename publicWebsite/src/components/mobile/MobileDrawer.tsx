import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, Gift, MapPin, Settings, Star, UserCircle2, Wallet, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type MobileDrawerProps = {
    trigger: React.ReactNode;
};

const getInitials = (value?: string) => {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "DD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function MobileDrawer({ trigger }: MobileDrawerProps) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { t } = useTranslation();

    const roleKey = String(user?.role || "customer").toLowerCase();
    const roleLabel =
        roleKey === "business_owner"
            ? t("account.roles.businessOwner")
            : roleKey === "admin"
                ? t("account.roles.admin")
                : roleKey === "staff"
                    ? t("account.roles.staff")
                    : t("account.roles.customer");

    const onNavigate = (path: string) => {
        navigate(path);
        setOpen(false);
    };

    return (
        <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent className="max-h-[92vh] flex flex-col rounded-t-[28px] border bg-card/95 backdrop-blur-xl">
                <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-muted-foreground/25" />
                <DrawerHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                        <DrawerTitle className="text-xl font-black tracking-tight text-foreground">{t("mobileDrawer.title")}</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full bg-background/60 border border-border text-muted-foreground hover:bg-background">
                                <X className="h-5 w-5" />
                            </Button>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-4">
                    {!isAuthenticated ? (
                        <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border border-border">
                                    <AvatarFallback className="bg-muted text-foreground font-semibold">DD</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{t("mobileDrawer.guest.title")}</p>
                                    <p className="text-xs text-muted-foreground">{t("mobileDrawer.guest.desc")}</p>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full border-primary text-primary hover:bg-primary/10"
                                >
                                    <Link to="/login" onClick={() => setOpen(false)}>
                                        {t("actions.login")}
                                    </Link>
                                </Button>
                                <Button asChild className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                                    <Link to="/signup" onClick={() => setOpen(false)}>
                                        {t("actions.signup")}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 border border-primary/20">
                                            <AvatarImage src={user?.avatarUrl} alt={user?.name || t("mobileDrawer.fallbackUser")} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {getInitials(user?.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-foreground truncate">{user?.name || t("mobileDrawer.fallbackUser")}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                                        </div>
                                    </div>

                                    <Badge className="bg-primary/10 text-primary border border-primary/20">
                                        {roleLabel}
                                    </Badge>
                                </div>
                            </div>

                            <div className="rounded-2xl border bg-card/80 p-3 shadow-sm space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                                    onClick={() => onNavigate("/account?tab=overview")}
                                >
                                    <UserCircle2 className="h-4 w-4" />
                                    {t("account.nav.overview")}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 bg-card"
                                    onClick={() => onNavigate("/account?tab=location")}
                                >
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    {t("account.nav.location")}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 bg-card"
                                    onClick={() => onNavigate("/account?tab=bookings")}
                                >
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    {t("account.nav.bookings")}
                                </Button>
                                {String(user?.role || "").toLowerCase() === "customer" ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 bg-card"
                                            onClick={() => onNavigate("/account?tab=referrals")}
                                        >
                                            <Gift className="h-4 w-4 text-muted-foreground" />
                                            {t("account.nav.referrals")}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 bg-card"
                                            onClick={() => onNavigate("/account?tab=wallet")}
                                        >
                                            <Wallet className="h-4 w-4 text-muted-foreground" />
                                            {t("account.nav.wallet")}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 bg-card"
                                            onClick={() => onNavigate("/account?tab=feedback")}
                                        >
                                            <Star className="h-4 w-4 text-muted-foreground" />
                                            {t("account.nav.feedback")}
                                        </Button>
                                    </>
                                ) : null}
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 bg-card"
                                    onClick={() => onNavigate("/account?tab=settings")}
                                >
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    {t("account.nav.settings")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
