export const shopData = {
  shop_name: "Ram Kirana Store",
  slug: "ram-kirana-store",
  category: "Grocery & General Store",
  description: "Your trusted neighborhood kirana store with fresh groceries, daily essentials, and household items. Serving the community for 15+ years.",
  whatsapp_number: "919876543210",
  call_number: "919876543210",
  email: "ram@kiranstore.com",
  address: "Shop No. 12, Main Market Road, Malviya Nagar",
  city: "Jaipur",
  area: "Malviya Nagar",
  pincode: "302017",
  opening_time: "08:00",
  closing_time: "21:00",
  weekly_off: ["Sunday"],
  rating: 4.2,
  reviews_count: 127,
  logo: "",
  cover_image: "",
  theme_color: "#1DBF73",
  subscription_plan: "Pro",
  subscription_expiry: "2026-06-15",
  total_views: 2847,
  whatsapp_clicks: 432,
  call_clicks: 189,
  map_clicks: 267,
};

export interface Product {
  product_id: string;
  product_name: string;
  price: number;
  original_price?: number;
  product_image: string;
  category: string;
  availability_status: boolean;
  description?: string;
  unit?: string;
  badge?: string;
}

export const mockProducts: Product[] = [
  { product_id: "1", product_name: "Tata Salt", price: 28, original_price: 32, product_image: "🧂", category: "Grocery", availability_status: true, unit: "1 kg", badge: "Bestseller", description: "Premium iodized salt" },
  { product_id: "2", product_name: "Aashirvaad Atta", price: 320, original_price: 380, product_image: "🌾", category: "Grocery", availability_status: true, unit: "5 kg", badge: "Popular", description: "Whole wheat flour" },
  { product_id: "3", product_name: "Fortune Oil", price: 185, original_price: 210, product_image: "🫒", category: "Grocery", availability_status: true, unit: "1 L", description: "Refined soyabean oil" },
  { product_id: "4", product_name: "Amul Butter", price: 56, product_image: "🧈", category: "Dairy", availability_status: true, unit: "100 g", badge: "Fresh", description: "Pasteurized butter" },
  { product_id: "5", product_name: "Maggi Noodles", price: 14, product_image: "🍜", category: "Snacks", availability_status: true, unit: "1 pc", description: "2-minute instant noodles" },
  { product_id: "6", product_name: "Parle-G Biscuit", price: 10, product_image: "🍪", category: "Snacks", availability_status: true, unit: "1 pack", description: "Glucose biscuits" },
  { product_id: "7", product_name: "Surf Excel", price: 145, original_price: 165, product_image: "🧹", category: "Household", availability_status: true, unit: "1 kg", badge: "Deal", description: "Detergent powder" },
  { product_id: "8", product_name: "Colgate MaxFresh", price: 89, product_image: "🪥", category: "Personal Care", availability_status: true, unit: "150 g", description: "Toothpaste with cooling crystals" },
  { product_id: "9", product_name: "Amul Milk", price: 30, product_image: "🥛", category: "Dairy", availability_status: true, unit: "500 ml", badge: "Daily", description: "Toned milk" },
  { product_id: "10", product_name: "Red Label Tea", price: 210, original_price: 240, product_image: "🍵", category: "Beverages", availability_status: true, unit: "250 g", description: "Premium blend tea" },
  { product_id: "11", product_name: "Vim Dishwash Bar", price: 35, product_image: "🧼", category: "Household", availability_status: true, unit: "200 g", description: "Lemon fresh dishwash" },
  { product_id: "12", product_name: "Dettol Soap", price: 42, product_image: "🧴", category: "Personal Care", availability_status: false, unit: "75 g", description: "Antibacterial bath soap" },
];

export interface Order {
  order_id: string;
  customer_name: string;
  items: string[];
  total: number;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  date: string;
  whatsapp: string;
}

export const mockOrders: Order[] = [
  { order_id: "ORD001", customer_name: "Priya Sharma", items: ["Tata Salt", "Aashirvaad Atta", "Fortune Oil"], total: 533, status: "delivered", date: "2026-02-10", whatsapp: "919999000001" },
  { order_id: "ORD002", customer_name: "Rahul Verma", items: ["Maggi Noodles x5", "Parle-G x3"], total: 100, status: "delivered", date: "2026-02-10", whatsapp: "919999000002" },
  { order_id: "ORD003", customer_name: "Sneha Gupta", items: ["Amul Butter x2", "Amul Milk x4"], total: 232, status: "confirmed", date: "2026-02-11", whatsapp: "919999000003" },
  { order_id: "ORD004", customer_name: "Amit Kumar", items: ["Surf Excel", "Vim Bar x2"], total: 215, status: "pending", date: "2026-02-11", whatsapp: "919999000004" },
  { order_id: "ORD005", customer_name: "Neha Singh", items: ["Red Label Tea", "Colgate MaxFresh"], total: 299, status: "pending", date: "2026-02-11", whatsapp: "919999000005" },
  { order_id: "ORD006", customer_name: "Vikash Yadav", items: ["Fortune Oil x2", "Dettol Soap x3"], total: 496, status: "delivered", date: "2026-02-09", whatsapp: "919999000006" },
  { order_id: "ORD007", customer_name: "Ritu Agarwal", items: ["Aashirvaad Atta", "Tata Salt x2"], total: 376, status: "delivered", date: "2026-02-08", whatsapp: "919999000007" },
  { order_id: "ORD008", customer_name: "Manish Jain", items: ["Amul Milk x6"], total: 180, status: "cancelled", date: "2026-02-09", whatsapp: "919999000008" },
];

export const generateDailyViews = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      views: Math.floor(60 + Math.random() * 40 + i * 1.5),
      whatsapp: Math.floor(10 + Math.random() * 15 + i * 0.5),
      calls: Math.floor(5 + Math.random() * 8),
    });
  }
  return data;
};

export const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  views: i >= 8 && i <= 21
    ? Math.floor(10 + Math.random() * 30 + (i >= 10 && i <= 14 ? 20 : 0) + (i >= 18 && i <= 20 ? 25 : 0))
    : Math.floor(Math.random() * 5),
}));

export const deviceData = [
  { name: "Mobile", value: 78, fill: "hsl(153, 73%, 43%)" },
  { name: "Desktop", value: 22, fill: "hsl(224, 76%, 53%)" },
];

export const subscriptionPlans = [
  { name: "Starter", price: 199, features: ["Basic Shop Page", "5 Products", "WhatsApp Button", "Monthly Analytics"] },
  { name: "Pro", price: 499, features: ["Custom Branding", "Unlimited Products", "Priority Support", "Detailed Analytics", "Custom Domain"], popular: true },
  { name: "Business", price: 999, features: ["Everything in Pro", "Multiple Locations", "Team Access", "API Access", "Dedicated Manager"] },
];

export const mockInvoices = [
  { invoice_id: "INV-2026-001", amount: 499, date: "2026-01-15", status: "paid" as const },
  { invoice_id: "INV-2025-012", amount: 499, date: "2025-12-15", status: "paid" as const },
  { invoice_id: "INV-2025-011", amount: 499, date: "2025-11-15", status: "paid" as const },
  { invoice_id: "INV-2025-010", amount: 199, date: "2025-10-15", status: "paid" as const },
];

export const mockTickets = [
  { ticket_id: "TKT001", issue_type: "Billing", message: "Invoice not received for last month", status: "resolved" as const, date: "2026-01-20", response: "Invoice has been sent to your email." },
  { ticket_id: "TKT002", issue_type: "Technical", message: "Shop page not loading on mobile", status: "open" as const, date: "2026-02-08" },
];
