import mongoose from 'mongoose';
import { BusinessType } from '../models/index.js';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

// Load environment variables
dotenv.config();

const businessTypes = [
  {
    name: 'Kirana Store',
    icon: '🏪',
    iconName: 'Store',
    description: 'General grocery and daily essentials store',
    suggestedListingType: 'product',
    exampleCategories: ['Grocery', 'Dairy', 'Snacks', 'Beverages', 'Personal Care'],
    whyChooseUsTemplates: [
      { title: 'Fresh Stock', desc: 'Daily restock of essentials', iconName: 'Leaf' },
      { title: 'Best Prices', desc: 'Value deals on groceries', iconName: 'BadgeIndianRupee' },
      { title: 'Fast Delivery', desc: 'Quick local delivery support', iconName: 'Truck' },
      { title: 'Trusted Service', desc: 'Known in your neighborhood', iconName: 'Award' },
    ],
    displayOrder: 1,
  },
  {
    name: 'Restaurant',
    icon: '🍽️',
    iconName: 'Utensils',
    description: 'Food service and dining establishment',
    suggestedListingType: 'food',
    exampleCategories: ['Fast Food', 'Chinese', 'Indian', 'Beverages', 'Desserts'],
    whyChooseUsTemplates: [
      { title: 'Tasty Food', desc: 'Delicious recipes made fresh', iconName: 'Utensils' },
      { title: 'Hygienic Kitchen', desc: 'Clean & safe preparation', iconName: 'Leaf' },
      { title: 'Quick Service', desc: 'Fast order preparation', iconName: 'Truck' },
      { title: 'Best Combos', desc: 'Great value meal options', iconName: 'BadgeIndianRupee' },
    ],
    displayOrder: 2,
  },
  {
    name: 'Coaching Center',
    icon: '📚',
    iconName: 'GraduationCap',
    description: 'Educational and training institute',
    suggestedListingType: 'course',
    exampleCategories: ['Competitive Exams', 'School Tuition', 'Language Classes', 'Computer Courses'],
    whyChooseUsTemplates: [
      { title: 'Expert Faculty', desc: 'Experienced teachers & mentors', iconName: 'GraduationCap' },
      { title: 'Structured Courses', desc: 'Clear syllabus & timetable', iconName: 'NotebookPen' },
      { title: 'Regular Tests', desc: 'Practice with mock exams', iconName: 'Award' },
      { title: 'Student Support', desc: 'Doubts cleared on time', iconName: 'BadgeIndianRupee' },
    ],
    displayOrder: 3,
  },
  {
    name: 'Property Rental',
    icon: '🏠',
    iconName: 'Home',
    description: 'Room, flat, or property rental services',
    suggestedListingType: 'rental',
    exampleCategories: ['1 BHK', '2 BHK', 'PG', 'Hostel', 'Commercial Space'],
    whyChooseUsTemplates: [
      { title: 'Verified Listings', desc: 'Genuine rental options', iconName: 'Home' },
      { title: 'Fair Pricing', desc: 'Transparent rent & terms', iconName: 'BadgeIndianRupee' },
      { title: 'Prime Locations', desc: 'Options near key areas', iconName: 'MapPin' },
      { title: 'Quick Assistance', desc: 'Fast response on inquiries', iconName: 'Truck' },
    ],
    displayOrder: 4,
  },
  {
    name: 'Salon & Spa',
    icon: '💇',
    iconName: 'Scissors',
    description: 'Beauty and wellness services',
    suggestedListingType: 'service',
    exampleCategories: ['Hair Services', 'Facial', 'Massage', 'Nail Art', 'Bridal Services'],
    whyChooseUsTemplates: [
      { title: 'Skilled Staff', desc: 'Trained professionals', iconName: 'Scissors' },
      { title: 'Premium Products', desc: 'Quality brands used', iconName: 'Award' },
      { title: 'Hygienic Setup', desc: 'Clean tools & environment', iconName: 'Leaf' },
      { title: 'Relaxing Experience', desc: 'Comfortable service', iconName: 'Coffee' },
    ],
    displayOrder: 5,
  },
  {
    name: 'Clothing Store',
    icon: '👕',
    iconName: 'Shirt',
    description: 'Apparel and fashion retail',
    suggestedListingType: 'product',
    exampleCategories: ['Men\'s Wear', 'Women\'s Wear', 'Kids Wear', 'Ethnic Wear', 'Accessories'],
    whyChooseUsTemplates: [
      { title: 'Latest Collection', desc: 'New designs & trends', iconName: 'Shirt' },
      { title: 'Best Quality', desc: 'Premium fabric options', iconName: 'Award' },
      { title: 'Great Offers', desc: 'Seasonal discounts available', iconName: 'BadgeIndianRupee' },
      { title: 'Easy Exchange', desc: 'Support for size issues', iconName: 'Truck' },
    ],
    displayOrder: 6,
  },
  {
    name: 'Electronics Shop',
    icon: '📱',
    iconName: 'Smartphone',
    description: 'Electronic goods and gadgets',
    suggestedListingType: 'product',
    exampleCategories: ['Mobile Phones', 'Laptops', 'Home Appliances', 'Accessories', 'Cameras'],
    whyChooseUsTemplates: [
      { title: 'Genuine Products', desc: 'Trusted brands only', iconName: 'Smartphone' },
      { title: 'Warranty Support', desc: 'After-sales assistance', iconName: 'Award' },
      { title: 'Best Deals', desc: 'Competitive pricing', iconName: 'BadgeIndianRupee' },
      { title: 'Expert Guidance', desc: 'Help choosing right device', iconName: 'NotebookPen' },
    ],
    displayOrder: 7,
  },
  {
    name: 'Medical Store',
    icon: '💊',
    iconName: 'Pill',
    description: 'Pharmacy and medical supplies',
    suggestedListingType: 'product',
    exampleCategories: ['Medicines', 'Health Supplements', 'Medical Equipment', 'Personal Care'],
    whyChooseUsTemplates: [
      { title: 'Genuine Medicines', desc: 'Trusted suppliers', iconName: 'Pill' },
      { title: 'Fast Availability', desc: 'Quick fulfilment support', iconName: 'Truck' },
      { title: 'Care Guidance', desc: 'Basic usage help', iconName: 'NotebookPen' },
      { title: 'Home Delivery', desc: 'Local delivery available', iconName: 'Home' },
    ],
    displayOrder: 8,
  },
  {
    name: 'Car Service Center',
    icon: '🚗',
    iconName: 'Car',
    description: 'Automobile service and repair',
    suggestedListingType: 'service',
    exampleCategories: ['General Service', 'AC Repair', 'Denting & Painting', 'Wheel Alignment'],
    whyChooseUsTemplates: [
      { title: 'Expert Mechanics', desc: 'Skilled service team', iconName: 'Wrench' },
      { title: 'Genuine Parts', desc: 'Quality parts used', iconName: 'Car' },
      { title: 'Transparent Billing', desc: 'Clear work & costs', iconName: 'BadgeIndianRupee' },
      { title: 'Quick Turnaround', desc: 'On-time delivery', iconName: 'Truck' },
    ],
    displayOrder: 9,
  },
  {
    name: 'Gym & Fitness',
    icon: '🏋️',
    iconName: 'Dumbbell',
    description: 'Fitness center and gym services',
    suggestedListingType: 'service',
    exampleCategories: ['Membership Plans', 'Personal Training', 'Yoga Classes', 'Zumba'],
    whyChooseUsTemplates: [
      { title: 'Certified Trainers', desc: 'Guided workouts', iconName: 'Dumbbell' },
      { title: 'Modern Equipment', desc: 'Well-maintained machines', iconName: 'Award' },
      { title: 'Flexible Plans', desc: 'Multiple membership options', iconName: 'BadgeIndianRupee' },
      { title: 'Motivating Culture', desc: 'Supportive environment', iconName: 'Leaf' },
    ],
    displayOrder: 10,
  },
  {
    name: 'Bakery & Cafe',
    icon: '🥐',
    iconName: 'Coffee',
    description: 'Bakery items and cafe',
    suggestedListingType: 'food',
    exampleCategories: ['Cakes', 'Pastries', 'Breads', 'Cookies', 'Beverages'],
    whyChooseUsTemplates: [
      { title: 'Fresh Bakes', desc: 'Prepared daily', iconName: 'Coffee' },
      { title: 'Quality Ingredients', desc: 'Hygienic preparation', iconName: 'Leaf' },
      { title: 'Custom Orders', desc: 'Cakes for occasions', iconName: 'Award' },
      { title: 'Cozy Ambience', desc: 'Great café experience', iconName: 'Utensils' },
    ],
    displayOrder: 11,
  },
  {
    name: 'Stationery Shop',
    icon: '📝',
    iconName: 'NotebookPen',
    description: 'Books and stationery supplies',
    suggestedListingType: 'product',
    exampleCategories: ['Books', 'Notebooks', 'Art Supplies', 'Office Supplies'],
    whyChooseUsTemplates: [
      { title: 'Wide Variety', desc: 'All school & office items', iconName: 'NotebookPen' },
      { title: 'Best Prices', desc: 'Affordable supplies', iconName: 'BadgeIndianRupee' },
      { title: 'Quality Brands', desc: 'Trusted manufacturers', iconName: 'Award' },
      { title: 'Quick Service', desc: 'Fast billing & support', iconName: 'Truck' },
    ],
    displayOrder: 12,
  },
  {
    name: 'Mobile Repair',
    icon: '🛠️',
    iconName: 'Wrench',
    description: 'Mobile and gadget repair services',
    suggestedListingType: 'service',
    exampleCategories: ['Screen Replacement', 'Battery Replacement', 'Software Issues', 'Water Damage'],
    whyChooseUsTemplates: [
      { title: 'Quick Repair', desc: 'Fast service where possible', iconName: 'Wrench' },
      { title: 'Skilled Technicians', desc: 'Experienced staff', iconName: 'Award' },
      { title: 'Genuine Parts', desc: 'Quality replacement parts', iconName: 'Smartphone' },
      { title: 'Warranty Support', desc: 'Post-repair assistance', iconName: 'Truck' },
    ],
    displayOrder: 13,
  },
  {
    name: 'Furniture Store',
    icon: '🛋️',
    iconName: 'Sofa',
    description: 'Furniture and home decor',
    suggestedListingType: 'product',
    exampleCategories: ['Bedroom Furniture', 'Living Room', 'Kitchen', 'Office Furniture'],
    whyChooseUsTemplates: [
      { title: 'Premium Quality', desc: 'Strong build & finish', iconName: 'Award' },
      { title: 'Modern Designs', desc: 'Latest styles available', iconName: 'Sofa' },
      { title: 'Custom Orders', desc: 'Made-to-fit options', iconName: 'NotebookPen' },
      { title: 'Delivery Support', desc: 'Local delivery available', iconName: 'Truck' },
    ],
    displayOrder: 14,
  },
  {
    name: 'Pet Shop',
    icon: '🐾',
    iconName: 'PawPrint',
    description: 'Pet supplies and services',
    suggestedListingType: 'product',
    exampleCategories: ['Pet Food', 'Pet Accessories', 'Grooming Services', 'Pet Medicine'],
    whyChooseUsTemplates: [
      { title: 'Trusted Products', desc: 'Safe pet essentials', iconName: 'PawPrint' },
      { title: 'Wide Variety', desc: 'Food, toys, accessories', iconName: 'Store' },
      { title: 'Care Advice', desc: 'Basic guidance for pets', iconName: 'NotebookPen' },
      { title: 'Grooming Support', desc: 'Services available', iconName: 'Scissors' },
    ],
    displayOrder: 15,
  },
];

const seedBusinessTypes = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/apnidukan';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing business types
    await BusinessType.deleteMany({});
    console.log('🗑️  Cleared existing business types');

    // Insert new business types using create() to trigger pre-save hooks for slug generation
    const result = await BusinessType.create(businessTypes);
    console.log(`✅ Seeded ${result.length} business types successfully!`);

    // Display created types
    console.log('\n📋 Business Types Created:');
    result.forEach((type, index) => {
      console.log(`${index + 1}. ${type.icon || '—'} ${type.name} (${type.suggestedListingType})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding business types:', error);
    process.exit(1);
  }
};

// Run the seed function
const isDirectRun = (() => {
  try {
    const entry = process.argv?.[1];
    if (!entry) return false;
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  seedBusinessTypes();
}
