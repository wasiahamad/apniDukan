// Mock data for the admin dashboard

export interface Shop {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  category: string;
  services: string[];
  workingHours: string;
  deliveryAvailable: boolean;
  paymentModes: string[];
  subscriptionPlan: string;
  status: "active" | "suspended" | "inactive";
  subdomain: string;
  customDomain?: string;
  sslStatus: "active" | "pending" | "expired";
  googleIndexing: "indexed" | "pending" | "not_indexed";
  createdDate: string;
  assignedExecutive?: string;
}

export interface Order {
  id: string;
  shopId: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  items: string[];
  amount: number;
  source: "whatsapp" | "website";
  status: "new" | "confirmed" | "out_for_delivery" | "delivered" | "cancelled";
  createdDate: string;
  cancelReason?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "quarterly" | "yearly";
  features: string[];
}

export interface Invoice {
  id: string;
  shopId: string;
  shopName: string;
  amount: number;
  paymentMode: string;
  paymentStatus: "paid" | "pending" | "overdue";
  invoiceDate: string;
}

export interface SupportTicket {
  id: string;
  shopId: string;
  shopName: string;
  issueType: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedExecutive: string;
  createdDate: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  area: string;
  assignedOrders: number;
  status: "available" | "busy" | "offline";
}

const cities = ["Mumbai", "Delhi", "Bangalore", "Pune", "Jaipur", "Hyderabad", "Chennai", "Kolkata"];
const categories = ["Grocery", "Electronics", "Fashion", "Restaurant", "Pharmacy", "Hardware", "Bakery", "Stationery"];

export const mockShops: Shop[] = Array.from({ length: 24 }, (_, i) => ({
  id: `SHOP-${String(i + 1).padStart(4, "0")}`,
  businessName: [
    "Sharma General Store", "Patel Electronics", "Fashion Hub", "Gupta Sweets", 
    "MedPlus Pharmacy", "Royal Hardware", "Fresh Bakes", "Book World",
    "Anand Grocers", "Tech Zone", "Style Studio", "Spice Kitchen",
    "Health First", "Build Smart", "Sugar & Flour", "Pen Palace",
    "Daily Needs", "Gadget Galaxy", "Trendy Wear", "Ruchi Restaurant",
    "Care Chemist", "Tools Corner", "Cake Walk", "Office Mart"
  ][i],
  ownerName: [
    "Rajesh Sharma", "Amit Patel", "Priya Singh", "Suresh Gupta",
    "Dr. Meena Joshi", "Vikram Rathore", "Sunita Devi", "Ankit Verma",
    "Anand Kumar", "Rohit Mehta", "Neha Kapoor", "Ravi Choudhary",
    "Dr. Sanjay Mishra", "Deepak Yadav", "Pooja Agarwal", "Manoj Tiwari",
    "Sushil Pandey", "Karan Malhotra", "Divya Nair", "Chef Ramesh",
    "Rekha Sharma", "Prakash Jain", "Meera Iyer", "Sunil Reddy"
  ][i],
  phone: `+91 ${9800000000 + i * 1111}`,
  email: `shop${i + 1}@example.com`,
  address: `${i + 1}, Market Road`,
  city: cities[i % cities.length],
  pincode: `${400000 + i * 11}`,
  category: categories[i % categories.length],
  services: ["Home Delivery", "Online Orders", "COD"],
  workingHours: "9:00 AM - 9:00 PM",
  deliveryAvailable: i % 3 !== 0,
  paymentModes: ["Cash", "UPI", "Card"],
  subscriptionPlan: ["Starter", "Growth", "Pro", "Enterprise"][i % 4],
  status: i % 5 === 0 ? "suspended" : i % 7 === 0 ? "inactive" : "active",
  subdomain: `shop${i + 1}.localbooster.in`,
  customDomain: i % 3 === 0 ? `www.shop${i + 1}.com` : undefined,
  sslStatus: i % 4 === 0 ? "pending" : "active",
  googleIndexing: i % 3 === 0 ? "indexed" : i % 3 === 1 ? "pending" : "not_indexed",
  createdDate: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
  assignedExecutive: ["Rahul", "Priya", "Amit"][i % 3],
}));

export const mockOrders: Order[] = Array.from({ length: 30 }, (_, i) => ({
  id: `ORD-${String(i + 1).padStart(5, "0")}`,
  shopId: mockShops[i % mockShops.length].id,
  shopName: mockShops[i % mockShops.length].businessName,
  customerName: [
    "Aarav Patel", "Vivaan Sharma", "Aditya Kumar", "Vihaan Singh", "Arjun Gupta",
    "Sai Verma", "Reyansh Mehta", "Ayaan Joshi", "Krishna Das", "Ishaan Roy",
    "Ananya Mishra", "Diya Yadav", "Myra Agarwal", "Sara Nair", "Aadhya Reddy",
    "Kavya Iyer", "Zara Khan", "Riya Pandey", "Kiara Malhotra", "Avni Tiwari",
    "Raj Kapoor", "Sita Ram", "Gita Devi", "Mohan Lal", "Seema Bai",
    "Kiran Desai", "Amit Shah", "Pooja Patil", "Rahul Jain", "Neha Garg"
  ][i],
  customerPhone: `+91 ${9700000000 + i * 2222}`,
  items: [["Rice 5kg", "Dal 1kg"], ["Laptop Charger"], ["Kurta Set"], ["Rasgulla Box", "Gulab Jamun"], ["Paracetamol", "Bandage"]][i % 5],
  amount: [450, 1200, 2500, 800, 350, 1800, 550, 3200, 950, 1500][i % 10],
  source: i % 2 === 0 ? "whatsapp" : "website",
  status: (["new", "confirmed", "out_for_delivery", "delivered", "cancelled"] as const)[i % 5],
  createdDate: new Date(2025, 1, (i % 28) + 1).toISOString(),
}));

export const mockPlans: SubscriptionPlan[] = [
  { id: "plan-1", name: "Starter", price: 499, billingCycle: "monthly", features: ["Basic Website", "5 Products", "WhatsApp Orders", "Email Support"] },
  { id: "plan-2", name: "Growth", price: 999, billingCycle: "monthly", features: ["Custom Website", "50 Products", "WhatsApp + Web Orders", "Priority Support", "Basic Analytics"] },
  { id: "plan-3", name: "Pro", price: 1999, billingCycle: "monthly", features: ["Custom Domain", "Unlimited Products", "All Order Channels", "Delivery Management", "Advanced Analytics", "Phone Support"] },
  { id: "plan-4", name: "Enterprise", price: 4999, billingCycle: "monthly", features: ["Everything in Pro", "Multiple Locations", "API Access", "Dedicated Account Manager", "Custom Integrations", "SLA Guarantee"] },
];

export const mockInvoices: Invoice[] = Array.from({ length: 15 }, (_, i) => ({
  id: `INV-${String(i + 1).padStart(5, "0")}`,
  shopId: mockShops[i % mockShops.length].id,
  shopName: mockShops[i % mockShops.length].businessName,
  amount: mockPlans[i % mockPlans.length].price,
  paymentMode: ["UPI", "Bank Transfer", "Card", "Cash"][i % 4],
  paymentStatus: (["paid", "pending", "overdue"] as const)[i % 3],
  invoiceDate: new Date(2025, 0, (i % 28) + 1).toISOString(),
}));

export const mockTickets: SupportTicket[] = Array.from({ length: 10 }, (_, i) => ({
  id: `TKT-${String(i + 1).padStart(4, "0")}`,
  shopId: mockShops[i % mockShops.length].id,
  shopName: mockShops[i % mockShops.length].businessName,
  issueType: ["Website Down", "Payment Issue", "Order Problem", "Domain Setup", "Login Issue"][i % 5],
  message: "Need assistance with the reported issue.",
  status: (["open", "in_progress", "resolved", "closed"] as const)[i % 4],
  assignedExecutive: ["Rahul", "Priya", "Amit"][i % 3],
  createdDate: new Date(2025, 1, (i % 28) + 1).toISOString(),
}));

export const mockDeliveryPartners: DeliveryPartner[] = Array.from({ length: 8 }, (_, i) => ({
  id: `DEL-${String(i + 1).padStart(3, "0")}`,
  name: ["Raju", "Sunil", "Deepak", "Manoj", "Vikash", "Santosh", "Ganesh", "Arun"][i],
  phone: `+91 ${9600000000 + i * 3333}`,
  area: cities[i % cities.length],
  assignedOrders: [3, 1, 5, 2, 0, 4, 1, 3][i],
  status: (["available", "busy", "offline"] as const)[i % 3],
}));

// Dashboard stats
export const dashboardStats = {
  totalShops: mockShops.length,
  activeShops: mockShops.filter(s => s.status === "active").length,
  inactiveShops: mockShops.filter(s => s.status !== "active").length,
  totalOrders: mockOrders.length,
  todaysOrders: 8,
  totalRevenue: mockOrders.reduce((sum, o) => sum + o.amount, 0),
  expiringSubscriptions: 5,
  pendingTickets: mockTickets.filter(t => t.status === "open").length,
};
