export interface City {
  id: string;
  name: string;
  slug: string;
  totalShops: number;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  pricingOptions?: Array<{ label: string; price: number }>;
  description?: string;
  duration?: string;
  type?: "product" | "service" | "food" | "course" | "rental";
  attributes?: Array<{ name: string; value: string | number }>;
}

export interface TimeSlot {
  start: string;
  end: string;
  busy: boolean;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  city: string;
  citySlug: string;
  area: string;
  address: string;
  rating: number;
  reviewCount: number;
  activePlanPrice?: number;
  type?: "product" | "service" | "food" | "course" | "rental";
  suggestedListingType?: "product" | "service" | "food" | "course" | "rental";
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  weeklyOff: string;
  whatsapp: string;
  phone: string;
  description: string;
  coverImage: string;
  logo: string;
  paymentMethods: string[];
  products: Product[];
  latitude: number;
  longitude: number;
  verified: boolean;
  timeSlots?: TimeSlot[];
}

export interface PricingPlan {
  name: string;
  price: number;
  billingCycle: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

export const cities: City[] = [
  { id: "1", name: "Delhi", slug: "delhi", totalShops: 8, image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop" },
  { id: "2", name: "Mumbai", slug: "mumbai", totalShops: 7, image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&h=300&fit=crop" },
  { id: "3", name: "Bangalore", slug: "bangalore", totalShops: 7, image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=300&fit=crop" },
  { id: "4", name: "Jaipur", slug: "jaipur", totalShops: 6, image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=300&fit=crop" },
  { id: "5", name: "Pune", slug: "pune", totalShops: 5, image: "https://images.unsplash.com/photo-1572782252655-9c8771a0e25e?w=400&h=300&fit=crop" },
];

export const categories: Category[] = [
  { id: "1", name: "Salon", slug: "salon", icon: "✂️" },
  { id: "2", name: "Restaurant", slug: "restaurant", icon: "🍽️" },
  { id: "3", name: "Grocery", slug: "grocery", icon: "🛒" },
  { id: "4", name: "Tailor", slug: "tailor", icon: "🧵" },
  { id: "5", name: "Gym", slug: "gym", icon: "💪" },
  { id: "6", name: "Medical", slug: "medical", icon: "🏥" },
  { id: "7", name: "Electronics", slug: "electronics", icon: "📱" },
  { id: "8", name: "Bakery", slug: "bakery", icon: "🍰" },
];

export const shops: Shop[] = [
  // ========== DELHI (8 shops) ==========
  {
    id: "1", name: "Sharma Hair Studio", slug: "sharma-hair-studio-delhi", category: "Salon", categorySlug: "salon",
    city: "Delhi", citySlug: "delhi", area: "Lajpat Nagar", address: "Shop 12, Lajpat Nagar Market, Delhi",
    rating: 4.5, reviewCount: 128, isOpen: true, openingTime: "10:00 AM", closingTime: "9:00 PM", weeklyOff: "Monday",
    whatsapp: "919876543210", phone: "919876543210",
    description: "Premium hair salon with 15 years of experience. Expert in hair styling, coloring, and grooming.",
    coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1585747860019-8713fd8d7c62?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p1", name: "Haircut", price: 300, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=200&fit=crop", description: "Professional haircut with wash and styling. Includes head massage.", duration: "30 min", type: "service" },
      { id: "p2", name: "Hair Color", price: 1500, image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop", description: "Full hair coloring with premium brands like L'Oréal and Schwarzkopf.", duration: "1.5 hours", type: "service" },
      { id: "p3", name: "Beard Trim", price: 150, image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200&h=200&fit=crop", description: "Clean beard trim and shaping with hot towel finish.", duration: "15 min", type: "service" },
    ],
    latitude: 28.5690, longitude: 77.2378,
    timeSlots: [
      { start: "10:00", end: "11:00", busy: true },
      { start: "11:00", end: "12:00", busy: false },
      { start: "12:00", end: "13:00", busy: true },
      { start: "13:00", end: "14:00", busy: false },
      { start: "14:00", end: "15:00", busy: true },
      { start: "15:00", end: "16:00", busy: false },
      { start: "16:00", end: "17:00", busy: true },
      { start: "17:00", end: "18:00", busy: false },
      { start: "18:00", end: "19:00", busy: true },
      { start: "19:00", end: "20:00", busy: false },
      { start: "20:00", end: "21:00", busy: false },
    ],
  },
  {
    id: "2", name: "Annapurna Restaurant", slug: "annapurna-restaurant-delhi", category: "Restaurant", categorySlug: "restaurant",
    city: "Delhi", citySlug: "delhi", area: "Chandni Chowk", address: "45, Chandni Chowk Main Rd, Delhi",
    rating: 4.7, reviewCount: 342, isOpen: true, openingTime: "11:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543211", phone: "919876543211",
    description: "Authentic North Indian cuisine since 1985. Famous for butter chicken and biryani.",
    coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card", "Paytm"], verified: true,
    products: [
      { id: "p4", name: "Butter Chicken", price: 350, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&h=200&fit=crop", description: "Creamy butter chicken made with tandoori chicken in rich tomato gravy.", duration: "25 min", type: "product" },
      { id: "p5", name: "Biryani", price: 250, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop", description: "Aromatic basmati rice with tender meat and secret spices.", duration: "30 min", type: "product" },
      { id: "p6", name: "Thali", price: 200, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop", description: "Complete meal with dal, sabzi, roti, rice, raita and dessert.", duration: "20 min", type: "product" },
    ],
    latitude: 28.6506, longitude: 77.2310,
    timeSlots: [
      { start: "11:00", end: "12:00", busy: false },
      { start: "12:00", end: "13:00", busy: true },
      { start: "13:00", end: "14:00", busy: true },
      { start: "14:00", end: "15:00", busy: false },
      { start: "18:00", end: "19:00", busy: true },
      { start: "19:00", end: "20:00", busy: true },
      { start: "20:00", end: "21:00", busy: true },
      { start: "21:00", end: "22:00", busy: false },
      { start: "22:00", end: "23:00", busy: false },
    ],
  },
  {
    id: "3", name: "FreshMart Grocery", slug: "freshmart-grocery-delhi", category: "Grocery", categorySlug: "grocery",
    city: "Delhi", citySlug: "delhi", area: "Saket", address: "B-12, Saket Market, Delhi",
    rating: 4.2, reviewCount: 89, isOpen: true, openingTime: "8:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543212", phone: "919876543212",
    description: "Your daily needs store with fresh vegetables, fruits, and grocery items delivered to your doorstep.",
    coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: false,
    products: [
      { id: "p7", name: "Fresh Vegetables (1kg)", price: 60, image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop" },
      { id: "p8", name: "Fruits Basket", price: 250, image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop" },
    ],
    latitude: 28.5244, longitude: 77.2066,
  },
  {
    id: "4", name: "Royal Tailors", slug: "royal-tailors-delhi", category: "Tailor", categorySlug: "tailor",
    city: "Delhi", citySlug: "delhi", area: "Karol Bagh", address: "Shop 8, Karol Bagh Market, Delhi",
    rating: 4.6, reviewCount: 67, isOpen: false, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Sunday",
    whatsapp: "919876543213", phone: "919876543213",
    description: "Custom tailoring for men and women. Specializing in wedding wear and formal suits.",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p9", name: "Men's Suit", price: 5000, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop" },
      { id: "p10", name: "Blouse Stitching", price: 800, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&h=200&fit=crop" },
    ],
    latitude: 28.6519, longitude: 77.1905,
  },
  {
    id: "5", name: "PowerFit Gym", slug: "powerfit-gym-delhi", category: "Gym", categorySlug: "gym",
    city: "Delhi", citySlug: "delhi", area: "Lajpat Nagar", address: "2nd Floor, Lajpat Nagar-II, Delhi",
    rating: 4.3, reviewCount: 156, isOpen: true, openingTime: "5:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543214", phone: "919876543214",
    description: "Modern gym with cardio, strength training, and personal training options.",
    coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p11", name: "Monthly Membership", price: 1500, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop" },
      { id: "p12", name: "Personal Training (1 month)", price: 5000, image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop" },
    ],
    latitude: 28.5700, longitude: 77.2400,
  },
  {
    id: "19", name: "Delhi Medical Plus", slug: "delhi-medical-plus-delhi", category: "Medical", categorySlug: "medical",
    city: "Delhi", citySlug: "delhi", area: "Saket", address: "A-5, Saket Main Market, Delhi",
    rating: 4.4, reviewCount: 92, isOpen: true, openingTime: "8:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543230", phone: "919876543230",
    description: "Trusted pharmacy with all medicines at MRP. Free home delivery above ₹500.",
    coverImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p36", name: "Home Delivery", price: 0, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop" },
      { id: "p37", name: "Health Checkup Kit", price: 999, image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop" },
    ],
    latitude: 28.5270, longitude: 77.2100,
  },
  {
    id: "20", name: "Chandni Chowk Bakery", slug: "chandni-chowk-bakery-delhi", category: "Bakery", categorySlug: "bakery",
    city: "Delhi", citySlug: "delhi", area: "Chandni Chowk", address: "Near Jama Masjid, Chandni Chowk, Delhi",
    rating: 4.6, reviewCount: 234, isOpen: true, openingTime: "7:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543231", phone: "919876543231",
    description: "Old Delhi's legendary bakery. Famous for fruit cake, nankhatai, and rusks since 1960.",
    coverImage: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p38", name: "Fruit Cake (1kg)", price: 450, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop" },
      { id: "p39", name: "Nankhatai (500g)", price: 180, image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop" },
    ],
    latitude: 28.6510, longitude: 77.2330,
  },
  {
    id: "21", name: "Karol Bagh Electronics", slug: "karol-bagh-electronics-delhi", category: "Electronics", categorySlug: "electronics",
    city: "Delhi", citySlug: "delhi", area: "Karol Bagh", address: "Gaffar Market, Karol Bagh, Delhi",
    rating: 4.1, reviewCount: 178, isOpen: true, openingTime: "10:30 AM", closingTime: "8:30 PM", weeklyOff: "Sunday",
    whatsapp: "919876543232", phone: "919876543232",
    description: "Best deals on electronics, accessories, and repairs. Wholesale and retail.",
    coverImage: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card", "EMI"], verified: false,
    products: [
      { id: "p40", name: "Earbuds", price: 1200, image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=200&h=200&fit=crop" },
      { id: "p41", name: "Phone Case", price: 350, image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200&h=200&fit=crop" },
    ],
    latitude: 28.6525, longitude: 77.1910,
  },

  // ========== MUMBAI (7 shops) ==========
  {
    id: "6", name: "Bombay Biryani House", slug: "bombay-biryani-house-mumbai", category: "Restaurant", categorySlug: "restaurant",
    city: "Mumbai", citySlug: "mumbai", area: "Bandra", address: "15, Hill Road, Bandra West, Mumbai",
    rating: 4.8, reviewCount: 512, isOpen: true, openingTime: "12:00 PM", closingTime: "12:00 AM", weeklyOff: "None",
    whatsapp: "919876543215", phone: "919876543215",
    description: "Mumbai's best biryani and kebabs. Serving since 1972.",
    coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card", "Zomato"], verified: true,
    products: [
      { id: "p13", name: "Hyderabadi Biryani", price: 300, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop" },
      { id: "p14", name: "Seekh Kebab", price: 220, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop" },
    ],
    latitude: 19.0596, longitude: 72.8295,
  },
  {
    id: "7", name: "Glamour Salon", slug: "glamour-salon-mumbai", category: "Salon", categorySlug: "salon",
    city: "Mumbai", citySlug: "mumbai", area: "Andheri", address: "Shop 3, Link Road, Andheri West, Mumbai",
    rating: 4.4, reviewCount: 203, isOpen: true, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Tuesday",
    whatsapp: "919876543216", phone: "919876543216",
    description: "Unisex salon offering all beauty and grooming services.",
    coverImage: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p15", name: "Facial", price: 800, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&h=200&fit=crop" },
      { id: "p16", name: "Manicure & Pedicure", price: 600, image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop" },
    ],
    latitude: 19.1364, longitude: 72.8296,
  },
  {
    id: "8", name: "Mumbai Medical Store", slug: "mumbai-medical-store-mumbai", category: "Medical", categorySlug: "medical",
    city: "Mumbai", citySlug: "mumbai", area: "Dadar", address: "Opp. Dadar Station, Mumbai",
    rating: 4.1, reviewCount: 78, isOpen: true, openingTime: "8:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543217", phone: "919876543217",
    description: "24/7 pharmacy with home delivery. All medicines available at MRP.",
    coverImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: false,
    products: [
      { id: "p17", name: "Home Delivery", price: 0, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop" },
    ],
    latitude: 19.0178, longitude: 72.8478,
  },
  {
    id: "9", name: "Electronics Hub", slug: "electronics-hub-mumbai", category: "Electronics", categorySlug: "electronics",
    city: "Mumbai", citySlug: "mumbai", area: "Lamington Road", address: "Shop 55, Lamington Road, Mumbai",
    rating: 4.0, reviewCount: 145, isOpen: false, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Sunday",
    whatsapp: "919876543218", phone: "919876543218",
    description: "Best deals on mobile phones, laptops, and accessories.",
    coverImage: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card", "EMI"], verified: true,
    products: [
      { id: "p18", name: "Mobile Phone", price: 15000, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop" },
      { id: "p19", name: "Laptop", price: 45000, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop" },
    ],
    latitude: 18.9575, longitude: 72.8237,
  },
  {
    id: "22", name: "Bandra Gym & Fitness", slug: "bandra-gym-fitness-mumbai", category: "Gym", categorySlug: "gym",
    city: "Mumbai", citySlug: "mumbai", area: "Bandra", address: "Turner Road, Bandra West, Mumbai",
    rating: 4.6, reviewCount: 210, isOpen: true, openingTime: "5:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543233", phone: "919876543233",
    description: "Premium gym with Olympic-grade equipment, personal trainers, and group classes.",
    coverImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p42", name: "Annual Membership", price: 18000, image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop" },
      { id: "p43", name: "CrossFit (1 month)", price: 3000, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop" },
    ],
    latitude: 19.0600, longitude: 72.8350,
  },
  {
    id: "23", name: "Dadar Fresh Grocery", slug: "dadar-fresh-grocery-mumbai", category: "Grocery", categorySlug: "grocery",
    city: "Mumbai", citySlug: "mumbai", area: "Dadar", address: "Dadar Flower Market, Mumbai",
    rating: 4.3, reviewCount: 134, isOpen: true, openingTime: "6:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543234", phone: "919876543234",
    description: "Freshest vegetables, fruits, and flowers. Wholesale prices for everyone.",
    coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p44", name: "Vegetable Combo (2kg)", price: 120, image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop" },
      { id: "p45", name: "Fruit Box", price: 350, image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop" },
    ],
    latitude: 19.0180, longitude: 72.8450,
  },
  {
    id: "24", name: "Andheri Tailors Hub", slug: "andheri-tailors-hub-mumbai", category: "Tailor", categorySlug: "tailor",
    city: "Mumbai", citySlug: "mumbai", area: "Andheri", address: "Veera Desai Road, Andheri West, Mumbai",
    rating: 4.2, reviewCount: 87, isOpen: true, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Sunday",
    whatsapp: "919876543235", phone: "919876543235",
    description: "Expert tailoring for Bollywood-style fashion. Custom kurtas, sherwanis, and blouses.",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: false,
    products: [
      { id: "p46", name: "Sherwani", price: 8000, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop" },
      { id: "p47", name: "Kurta Stitching", price: 600, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&h=200&fit=crop" },
    ],
    latitude: 19.1370, longitude: 72.8280,
  },

  // ========== BANGALORE (7 shops) ==========
  {
    id: "10", name: "South Spice", slug: "south-spice-bangalore", category: "Restaurant", categorySlug: "restaurant",
    city: "Bangalore", citySlug: "bangalore", area: "Koramangala", address: "12th Cross, Koramangala, Bangalore",
    rating: 4.6, reviewCount: 287, isOpen: true, openingTime: "7:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543219", phone: "919876543219",
    description: "Authentic South Indian food. Best dosa and filter coffee in town.",
    coverImage: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p20", name: "Masala Dosa", price: 120, image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200&h=200&fit=crop" },
      { id: "p21", name: "Filter Coffee", price: 40, image: "https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9352, longitude: 77.6245,
  },
  {
    id: "11", name: "FitZone Gym", slug: "fitzone-gym-bangalore", category: "Gym", categorySlug: "gym",
    city: "Bangalore", citySlug: "bangalore", area: "Indiranagar", address: "100 Feet Road, Indiranagar, Bangalore",
    rating: 4.7, reviewCount: 198, isOpen: true, openingTime: "5:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543220", phone: "919876543220",
    description: "Premium fitness center with CrossFit, yoga, and Zumba classes.",
    coverImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p22", name: "Monthly Pass", price: 2500, image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop" },
      { id: "p23", name: "Yoga Classes (1 month)", price: 1800, image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9784, longitude: 77.6408,
  },
  {
    id: "12", name: "Sweet Treats Bakery", slug: "sweet-treats-bakery-bangalore", category: "Bakery", categorySlug: "bakery",
    city: "Bangalore", citySlug: "bangalore", area: "MG Road", address: "45, MG Road, Bangalore",
    rating: 4.5, reviewCount: 167, isOpen: true, openingTime: "8:00 AM", closingTime: "9:00 PM", weeklyOff: "None",
    whatsapp: "919876543221", phone: "919876543221",
    description: "Artisan bakery with fresh cakes, pastries, and breads daily.",
    coverImage: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: false,
    products: [
      { id: "p24", name: "Chocolate Cake (1kg)", price: 800, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop" },
      { id: "p25", name: "Croissant", price: 120, image: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9716, longitude: 77.5946,
  },
  {
    id: "13", name: "TechFix Electronics", slug: "techfix-electronics-bangalore", category: "Electronics", categorySlug: "electronics",
    city: "Bangalore", citySlug: "bangalore", area: "SP Road", address: "SP Road, Bangalore",
    rating: 4.3, reviewCount: 112, isOpen: true, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Sunday",
    whatsapp: "919876543222", phone: "919876543222",
    description: "Mobile and laptop repair. Genuine spare parts and warranty service.",
    coverImage: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p26", name: "Screen Repair", price: 2500, image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200&h=200&fit=crop" },
      { id: "p27", name: "Battery Replacement", price: 1000, image: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9830, longitude: 77.5770,
  },
  {
    id: "25", name: "Koramangala Salon", slug: "koramangala-salon-bangalore", category: "Salon", categorySlug: "salon",
    city: "Bangalore", citySlug: "bangalore", area: "Koramangala", address: "5th Block, Koramangala, Bangalore",
    rating: 4.4, reviewCount: 145, isOpen: true, openingTime: "9:00 AM", closingTime: "9:00 PM", weeklyOff: "Monday",
    whatsapp: "919876543236", phone: "919876543236",
    description: "Trendy unisex salon popular with IT professionals. Walk-ins welcome.",
    coverImage: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1585747860019-8713fd8d7c62?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p48", name: "Haircut + Wash", price: 400, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=200&fit=crop" },
      { id: "p49", name: "Hair Spa", price: 1200, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9360, longitude: 77.6200,
  },
  {
    id: "26", name: "Indiranagar Grocery Mart", slug: "indiranagar-grocery-mart-bangalore", category: "Grocery", categorySlug: "grocery",
    city: "Bangalore", citySlug: "bangalore", area: "Indiranagar", address: "12th Main, Indiranagar, Bangalore",
    rating: 4.2, reviewCount: 98, isOpen: true, openingTime: "7:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543237", phone: "919876543237",
    description: "Organic and imported groceries. Fresh produce daily from local farms.",
    coverImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: false,
    products: [
      { id: "p50", name: "Organic Veggies Box", price: 350, image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop" },
      { id: "p51", name: "Imported Cheese", price: 500, image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9790, longitude: 77.6380,
  },
  {
    id: "27", name: "MG Road Medical", slug: "mg-road-medical-bangalore", category: "Medical", categorySlug: "medical",
    city: "Bangalore", citySlug: "bangalore", area: "MG Road", address: "Brigade Road, MG Road, Bangalore",
    rating: 4.5, reviewCount: 110, isOpen: true, openingTime: "7:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543238", phone: "919876543238",
    description: "Trusted pharmacy chain with prescription verification and health consultations.",
    coverImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p52", name: "BP Monitor", price: 1800, image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop" },
      { id: "p53", name: "First Aid Kit", price: 450, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop" },
    ],
    latitude: 12.9720, longitude: 77.5950,
  },

  // ========== JAIPUR (6 shops) ==========
  {
    id: "14", name: "Rajasthan Sweets", slug: "rajasthan-sweets-jaipur", category: "Bakery", categorySlug: "bakery",
    city: "Jaipur", citySlug: "jaipur", area: "MI Road", address: "MI Road, Jaipur",
    rating: 4.8, reviewCount: 432, isOpen: true, openingTime: "8:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543223", phone: "919876543223",
    description: "Traditional Rajasthani sweets and namkeen. Famous for ghewar and kachori.",
    coverImage: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p28", name: "Ghewar (500g)", price: 350, image: "https://images.unsplash.com/photo-1590080876351-941da357a515?w=200&h=200&fit=crop" },
      { id: "p29", name: "Mix Namkeen (1kg)", price: 200, image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&h=200&fit=crop" },
    ],
    latitude: 26.9124, longitude: 75.7873,
  },
  {
    id: "15", name: "Jaipur Salon & Spa", slug: "jaipur-salon-spa-jaipur", category: "Salon", categorySlug: "salon",
    city: "Jaipur", citySlug: "jaipur", area: "Vaishali Nagar", address: "C-Scheme, Vaishali Nagar, Jaipur",
    rating: 4.4, reviewCount: 98, isOpen: true, openingTime: "9:00 AM", closingTime: "8:00 PM", weeklyOff: "Monday",
    whatsapp: "919876543224", phone: "919876543224",
    description: "Luxury salon and spa experience with international products.",
    coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1585747860019-8713fd8d7c62?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p30", name: "Hair Spa", price: 1200, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop" },
      { id: "p31", name: "Body Massage", price: 2000, image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&h=200&fit=crop" },
    ],
    latitude: 26.9124, longitude: 75.7280,
  },
  {
    id: "16", name: "Pink City Grocery", slug: "pink-city-grocery-jaipur", category: "Grocery", categorySlug: "grocery",
    city: "Jaipur", citySlug: "jaipur", area: "Malviya Nagar", address: "Malviya Nagar, Jaipur",
    rating: 4.0, reviewCount: 55, isOpen: true, openingTime: "7:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543225", phone: "919876543225",
    description: "One-stop shop for all daily grocery needs at best prices.",
    coverImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: false,
    products: [
      { id: "p32", name: "Monthly Ration Pack", price: 2500, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop" },
    ],
    latitude: 26.8600, longitude: 75.8065,
  },
  {
    id: "28", name: "Hawa Mahal Restaurant", slug: "hawa-mahal-restaurant-jaipur", category: "Restaurant", categorySlug: "restaurant",
    city: "Jaipur", citySlug: "jaipur", area: "MI Road", address: "Near Hawa Mahal, MI Road, Jaipur",
    rating: 4.5, reviewCount: 312, isOpen: true, openingTime: "10:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543239", phone: "919876543239",
    description: "Rajasthani thali with rooftop view of Hawa Mahal. Dal Baati Churma is a must-try.",
    coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p54", name: "Rajasthani Thali", price: 350, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop" },
      { id: "p55", name: "Dal Baati Churma", price: 220, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&h=200&fit=crop" },
    ],
    latitude: 26.9239, longitude: 75.8267,
  },
  {
    id: "29", name: "Jaipur Fit Factory", slug: "jaipur-fit-factory-jaipur", category: "Gym", categorySlug: "gym",
    city: "Jaipur", citySlug: "jaipur", area: "Vaishali Nagar", address: "Vaishali Nagar Main Road, Jaipur",
    rating: 4.3, reviewCount: 120, isOpen: true, openingTime: "5:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543240", phone: "919876543240",
    description: "Modern gym with AC, personal trainers, and Zumba studio. Ladies-only batch available.",
    coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p56", name: "Monthly Membership", price: 1200, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop" },
      { id: "p57", name: "Zumba (1 month)", price: 800, image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop" },
    ],
    latitude: 26.9130, longitude: 75.7260,
  },
  {
    id: "30", name: "Royal Electronics Jaipur", slug: "royal-electronics-jaipur", category: "Electronics", categorySlug: "electronics",
    city: "Jaipur", citySlug: "jaipur", area: "Malviya Nagar", address: "Tonk Road, Malviya Nagar, Jaipur",
    rating: 4.1, reviewCount: 76, isOpen: false, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Sunday",
    whatsapp: "919876543241", phone: "919876543241",
    description: "Electronics and home appliances. EMI available on all major brands.",
    coverImage: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card", "EMI"], verified: false,
    products: [
      { id: "p58", name: "Smart TV", price: 25000, image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop" },
      { id: "p59", name: "Washing Machine", price: 18000, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop" },
    ],
    latitude: 26.8610, longitude: 75.8050,
  },

  // ========== PUNE (5 shops) ==========
  {
    id: "17", name: "Pune Fitness Club", slug: "pune-fitness-club-pune", category: "Gym", categorySlug: "gym",
    city: "Pune", citySlug: "pune", area: "Koregaon Park", address: "Lane 5, Koregaon Park, Pune",
    rating: 4.5, reviewCount: 178, isOpen: true, openingTime: "5:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543226", phone: "919876543226",
    description: "State-of-the-art fitness center with personal training and group classes.",
    coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p33", name: "Quarterly Membership", price: 4000, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop" },
    ],
    latitude: 18.5362, longitude: 73.8939,
  },
  {
    id: "18", name: "Cafe Goodluck", slug: "cafe-goodluck-pune", category: "Restaurant", categorySlug: "restaurant",
    city: "Pune", citySlug: "pune", area: "FC Road", address: "FC Road, Deccan Gymkhana, Pune",
    rating: 4.6, reviewCount: 567, isOpen: true, openingTime: "7:00 AM", closingTime: "11:00 PM", weeklyOff: "None",
    whatsapp: "919876543227", phone: "919876543227",
    description: "Iconic Pune cafe serving bun maska and Irani chai since 1950.",
    coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p34", name: "Bun Maska + Chai", price: 80, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop" },
      { id: "p35", name: "Misal Pav", price: 120, image: "https://images.unsplash.com/photo-1606491956689-2ea866880049?w=200&h=200&fit=crop" },
    ],
    latitude: 18.5196, longitude: 73.8407,
  },
  {
    id: "31", name: "Pune Style Salon", slug: "pune-style-salon-pune", category: "Salon", categorySlug: "salon",
    city: "Pune", citySlug: "pune", area: "FC Road", address: "FC Road, Shivajinagar, Pune",
    rating: 4.3, reviewCount: 134, isOpen: true, openingTime: "10:00 AM", closingTime: "8:00 PM", weeklyOff: "Tuesday",
    whatsapp: "919876543242", phone: "919876543242",
    description: "Budget-friendly unisex salon with experienced stylists. Popular among college students.",
    coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: true,
    products: [
      { id: "p60", name: "Haircut", price: 200, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=200&fit=crop" },
      { id: "p61", name: "Facial", price: 500, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&h=200&fit=crop" },
    ],
    latitude: 18.5200, longitude: 73.8400,
  },
  {
    id: "32", name: "Koregaon Bakehouse", slug: "koregaon-bakehouse-pune", category: "Bakery", categorySlug: "bakery",
    city: "Pune", citySlug: "pune", area: "Koregaon Park", address: "Lane 6, Koregaon Park, Pune",
    rating: 4.7, reviewCount: 223, isOpen: true, openingTime: "8:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543243", phone: "919876543243",
    description: "European-style bakery with sourdough bread, artisan pastries, and specialty coffees.",
    coverImage: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI", "Card"], verified: true,
    products: [
      { id: "p62", name: "Sourdough Loaf", price: 280, image: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=200&h=200&fit=crop" },
      { id: "p63", name: "Tiramisu", price: 350, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop" },
    ],
    latitude: 18.5370, longitude: 73.8940,
  },
  {
    id: "33", name: "Pune Kirana Store", slug: "pune-kirana-store-pune", category: "Grocery", categorySlug: "grocery",
    city: "Pune", citySlug: "pune", area: "Kothrud", address: "Paud Road, Kothrud, Pune",
    rating: 4.1, reviewCount: 67, isOpen: true, openingTime: "7:00 AM", closingTime: "10:00 PM", weeklyOff: "None",
    whatsapp: "919876543244", phone: "919876543244",
    description: "Family-run grocery store with home delivery. Fresh atta, rice, and spices.",
    coverImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop",
    paymentMethods: ["Cash", "UPI"], verified: false,
    products: [
      { id: "p64", name: "Atta (10kg)", price: 450, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop" },
      { id: "p65", name: "Spice Box", price: 300, image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&h=200&fit=crop" },
    ],
    latitude: 18.5080, longitude: 73.8070,
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: 0,
    billingCycle: "forever",
    features: [
      "Basic shop listing",
      "WhatsApp button",
      "Google Maps listing",
      "5 products/services",
      "Basic analytics",
    ],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: 499,
    billingCycle: "month",
    popular: true,
    features: [
      "Everything in Free",
      "Verified badge ✅",
      "Unlimited products",
      "Priority listing",
      "Custom shop page URL",
      "Advanced analytics",
      "WhatsApp catalog sync",
    ],
    cta: "Start Pro Trial",
  },
  {
    name: "Premium",
    price: 999,
    billingCycle: "month",
    features: [
      "Everything in Pro",
      "Featured in city page",
      "Social media promotion",
      "Dedicated account manager",
      "Custom branding",
      "Multi-location support",
      "API access",
      "Priority support",
    ],
    cta: "Go Premium",
  },
];

// Helper functions
export const getShopsByCity = (citySlug: string) => shops.filter(s => s.citySlug === citySlug);
export const getShopsByCityAndCategory = (citySlug: string, catSlug: string) =>
  shops.filter(s => s.citySlug === citySlug && s.categorySlug === catSlug);
export const getShopBySlug = (slug: string) => shops.find(s => s.slug === slug);
export const getCityBySlug = (slug: string) => cities.find(c => c.slug === slug);
export const getCategoryBySlug = (slug: string) => categories.find(c => c.slug === slug);
export const getAreasForCity = (citySlug: string) => [...new Set(shops.filter(s => s.citySlug === citySlug).map(s => s.area))];
export const getFeaturedShops = () => shops.filter(s => s.verified).slice(0, 6);
