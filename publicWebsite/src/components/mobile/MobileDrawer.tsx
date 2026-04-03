import CategoryGrid from "@/components/mobile/CategoryGrid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/context/PlanContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CalendarDays, CircleHelp, LogOut, MapPin, Plus, Search, Settings, Sparkles, UserCircle2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type CityItem = {
    name: string;
    slug: string;
    totalShops: number;
};

type CategoryItem = {
    slug: string;
    name: string;
    icon?: string;
};

type MobileDrawerProps = {
    cities: CityItem[];
    categories: CategoryItem[];
    defaultCitySlug: string;
    trigger: React.ReactNode;
};

const staggerContainer = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.04,
        },
    },
};

const staggerItem = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.22, ease: "easeOut" },
    },
};

export default function MobileDrawer({ cities, categories, defaultCitySlug, trigger }: MobileDrawerProps) {
    const [open, setOpen] = useState(false);
    const [cityQuery, setCityQuery] = useState("");
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();
    const { currentPlan } = usePlan();
    const { toast } = useToast();

    const topCities = cities.slice(0, 5);

    const filteredCities = useMemo(
        () => cities.filter((city) => city.name.toLowerCase().includes(cityQuery.trim().toLowerCase())),
        [cities, cityQuery],
    );

    const onNavigate = (path: string) => {
        navigate(path);
        setOpen(false);
    };

    const onLogout = () => {
        logout();
        toast({ title: "Signed out", description: "You have been logged out." });
        setOpen(false);
        navigate("/login");
    };

    const accountActions = [
        {
            key: "add-account",
            label: "Add another account",
            icon: <Plus className="h-4 w-4 text-slate-500" />,
            onClick: () => onNavigate("/signup"),
        },
        {
            key: "my-account",
            label: "My Account",
            icon: <UserCircle2 className="h-4 w-4 text-slate-500" />,
            onClick: () => onNavigate("/account"),
        },
        {
            key: "my-bookings",
            label: "My Bookings",
            icon: <CalendarDays className="h-4 w-4 text-slate-500" />,
            onClick: () => onNavigate("/account?tab=bookings"),
        },
        {
            key: "my-plan",
            label: "My Plan",
            icon: <Sparkles className="h-4 w-4 text-emerald-600" />,
            onClick: () => onNavigate("/account?tab=plan"),
        },
        {
            key: "settings",
            label: "Settings",
            icon: <Settings className="h-4 w-4 text-slate-500" />,
            onClick: () => onNavigate("/account?tab=settings"),
        },
        {
            key: "help",
            label: "Help",
            icon: <CircleHelp className="h-4 w-4 text-slate-500" />,
            onClick: () => onNavigate("/contact"),
        },
        {
            key: "logout",
            label: "Logout",
            icon: <LogOut className="h-4 w-4" />,
            onClick: onLogout,
            isDanger: true,
        },
    ];

    return (
        <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent className="h-[92vh] rounded-t-[28px] border-0 bg-[radial-gradient(120%_70%_at_10%_0%,#ecfeff_0%,#f8fafc_38%,#f8fafc_60%,#eefbf3_100%)] backdrop-blur-xl">
                <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-slate-300/70" />
                <DrawerHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                        <DrawerTitle className="text-xl font-black tracking-tight text-slate-900">DukaanDirect Menu</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full bg-white/70 border border-slate-200 text-slate-600 hover:bg-white">
                                <X className="h-5 w-5" />
                            </Button>
                        </DrawerClose>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="inline-flex rounded-full bg-white px-2.5 py-1 border border-slate-200">Explore local stores</span>
                        <span className="inline-flex rounded-full bg-white px-2.5 py-1 border border-slate-200">Fast city switch</span>
                    </div>
                </DrawerHeader>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="px-4 pb-8 overflow-y-auto space-y-4"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.02, duration: 0.2 }}
                        className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)]"
                    >
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Quick Access</p>
                        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-2 grid grid-cols-2 gap-2">
                            <motion.div variants={staggerItem}>
                                <Link
                                    to="/"
                                    onClick={() => setOpen(false)}
                                    className="block rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 text-center"
                                >
                                    Home
                                </Link>
                            </motion.div>
                            <motion.div variants={staggerItem}>
                                <button
                                    type="button"
                                    onClick={() => onNavigate("/plans")}
                                    className="w-full rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-3 text-sm font-semibold text-emerald-700"
                                >
                                    Plans
                                </button>
                            </motion.div>
                        </motion.div>
                        <motion.div variants={staggerItem} initial="hidden" animate="show">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    window.open("/for-business", "_self");
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800"
                            >
                                For Business
                            </button>
                        </motion.div>
                    </motion.div>

                    <Accordion type="multiple" className="rounded-2xl border border-white/80 bg-white/80 px-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)]">
                        <AccordionItem value="cities" className="border-b-0">
                            <AccordionTrigger className="py-3 text-sm font-semibold text-slate-800 hover:no-underline">
                                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Cities</span>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={cityQuery}
                                            onChange={(e) => setCityQuery(e.target.value)}
                                            className="pl-9 h-10"
                                            placeholder="Search city"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {topCities.map((city) => (
                                            <button
                                                key={city.slug}
                                                type="button"
                                                onClick={() => onNavigate(`/${city.slug}`)}
                                                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                {city.name}
                                            </button>
                                        ))}
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">View All Cities</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md rounded-2xl">
                                            <DialogHeader>
                                                <DialogTitle>All Cities</DialogTitle>
                                            </DialogHeader>
                                            <div className="grid grid-cols-2 gap-2 max-h-[52vh] overflow-y-auto">
                                                {filteredCities.map((city) => (
                                                    <button
                                                        key={city.slug}
                                                        type="button"
                                                        onClick={() => onNavigate(`/${city.slug}`)}
                                                        className="rounded-xl border border-slate-200 p-2 text-left text-sm hover:bg-slate-50"
                                                    >
                                                        <p className="font-medium text-slate-800">{city.name}</p>
                                                        <p className="text-xs text-slate-500">{city.totalShops} shops</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="categories" className="border-b-0">
                            <AccordionTrigger className="py-3 text-sm font-semibold text-slate-800 hover:no-underline">Categories</AccordionTrigger>
                            <AccordionContent>
                                <CategoryGrid categories={categories} onSelect={(slug) => onNavigate(`/${defaultCitySlug}/${slug}`)} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {!isAuthenticated ? (
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">Account</p>
                            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
                                <motion.div variants={staggerItem}>
                                    <Button asChild variant="outline" className="w-full border-[rgb(30,190,118)] text-[rgb(30,190,118)] hover:bg-[rgb(30,190,118)]/10">
                                        <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
                                    </Button>
                                </motion.div>
                                <motion.div variants={staggerItem}>
                                    <Button asChild className="w-full bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white">
                                        <Link to="/signup" onClick={() => setOpen(false)}>Signup</Link>
                                    </Button>
                                </motion.div>
                            </motion.div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)]">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your Account</p>
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Sparkles className="h-3.5 w-3.5" /> {currentPlan.name}
                                </span>
                            </div>

                            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                                {accountActions.map((action) => (
                                    <motion.div key={action.key} variants={staggerItem}>
                                        <Button
                                            variant="outline"
                                            className={`w-full justify-start gap-2 bg-white ${action.isDanger ? "border-red-200 text-red-700 hover:bg-red-50" : ""}`}
                                            onClick={action.onClick}
                                        >
                                            {action.icon} {action.label}
                                        </Button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </DrawerContent>
        </Drawer>
    );
}
