import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { User, Business, Category, Listing, Plan, ReferralOffer } from '../models/index.js';

/**
 * SEED SCRIPT - Populate database with sample data
 * Run: npm run seed
 */

dotenv.config();

// Sample data
const sampleCategories = [
  { name: 'Grocery', slug: 'grocery', description: 'Daily essentials and food items' },
  { name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel' },
  { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
  { name: 'Restaurant', slug: 'restaurant', description: 'Food and dining' },
  { name: 'Salon & Spa', slug: 'salon-spa', description: 'Beauty and wellness services' },
  { name: 'Medical', slug: 'medical', description: 'Healthcare and medical services' },
];

const samplePlans = [
  {
    name: 'Free',
    slug: 'free',
    price: 0,
    durationInDays: 30,
    features: {
      maxListings: 10,
      bookingEnabled: false,
      featuredEnabled: false,
      maxFeaturedListings: 0,
      customDomain: false,
      analyticsEnabled: false,
      prioritySupport: false,
      whatsappIntegration: true,
      removeWatermark: false,
      seoTools: false,
      apiAccess: false,
    },
    description: 'Perfect for getting started',
    order: 1,
  },
  {
    name: 'Starter',
    slug: 'starter',
    price: 199,
    durationInDays: 30,
    features: {
      maxListings: 50,
      bookingEnabled: true,
      featuredEnabled: true,
      maxFeaturedListings: 3,
      customDomain: false,
      analyticsEnabled: true,
      prioritySupport: false,
      whatsappIntegration: true,
      removeWatermark: false,
      seoTools: true,
      apiAccess: false,
    },
    description: 'Best for small businesses',
    isPopular: true,
    order: 2,
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 499,
    durationInDays: 30,
    features: {
      maxListings: 200,
      bookingEnabled: true,
      featuredEnabled: true,
      maxFeaturedListings: 10,
      customDomain: true,
      analyticsEnabled: true,
      prioritySupport: true,
      whatsappIntegration: true,
      removeWatermark: true,
      seoTools: true,
      apiAccess: true,
    },
    description: 'For growing businesses',
    order: 3,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: 999,
    durationInDays: 30,
    features: {
      maxListings: -1, // Unlimited
      bookingEnabled: true,
      featuredEnabled: true,
      maxFeaturedListings: -1, // Unlimited
      customDomain: true,
      analyticsEnabled: true,
      prioritySupport: true,
      whatsappIntegration: true,
      removeWatermark: true,
      seoTools: true,
      apiAccess: true,
    },
    description: 'Unlimited everything',
    order: 4,
  },
];

const sampleReferralOffers = [
  {
    offerName: 'Basic Referral Program',
    referralThreshold: 3,
    rewardPlan: 'basic',
    rewardDuration: 1,
    status: 'active',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    termsAndConditions: 'Refer 3 businesses and get 1 month Basic plan free. Referred business must make their first payment to count as valid referral.',
  },
  {
    offerName: 'Standard Upgrade Campaign',
    referralThreshold: 5,
    rewardPlan: 'standard',
    rewardDuration: 1,
    status: 'active',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    termsAndConditions: 'Refer 5 businesses and unlock 1 month Standard plan absolutely free! All referrals must complete payment verification.',
  },
  {
    offerName: 'Premium Bonus Program',
    referralThreshold: 10,
    rewardPlan: 'premium',
    rewardDuration: 2,
    status: 'draft',
    validFrom: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    termsAndConditions: 'Elite referral program: Refer 10 businesses and receive 2 months Premium plan. Premium features unlocked for top performers.',
  },
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Business.deleteMany({});
    await Category.deleteMany({});
    await Listing.deleteMany({});
    await Plan.deleteMany({});
    await ReferralOffer.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@apnidukan.com',
      phone: '9999999999',
      password: 'admin123',
      role: 'admin',
    });
    console.log('✅ Admin user created:', adminUser.email);

    // Create business owner
    console.log('\n👤 Creating business owner...');
    const businessOwner = await User.create({
      name: 'Raj Kumar',
      email: 'raj@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'business_owner',
    });
    console.log('✅ Business owner created:', businessOwner.email);

    // Create plans
    console.log('\n💳 Creating subscription plans...');
    const plans = await Plan.insertMany(samplePlans);
    console.log(`✅ ${plans.length} plans created`);

    // Create referral offers
    console.log('\n🎁 Creating referral offers...');
    const referralOffers = await ReferralOffer.insertMany(
      sampleReferralOffers.map(offer => ({
        ...offer,
        createdBy: adminUser._id,
      }))
    );
    console.log(`✅ ${referralOffers.length} referral offers created`);

    // Create sample business
    console.log('\n🏪 Creating sample business...');
    const business = await Business.create({
      owner: businessOwner._id,
      name: "Raj's Kirana Store",
      slug: 'raj-kirana-store',
      category: 'grocery',
      phone: '9876543210',
      whatsapp: '9876543210',
      email: 'raj@example.com',
      address: {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      description: 'Your neighborhood grocery store with fresh products daily',
      plan: plans[1]._id, // Starter plan
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isVerified: true,
    });
    console.log('✅ Sample business created:', business.name);

    // Create categories
    console.log('\n📁 Creating categories...');
    const categoriesData = sampleCategories.map(cat => ({
      ...cat,
      business: business._id,
    }));
    const categories = await Category.insertMany(categoriesData);
    console.log(`✅ ${categories.length} categories created`);

    // Create sample listings
    console.log('\n📦 Creating sample listings...');
    const sampleListings = [
      {
        business: business._id,
        title: 'Premium Basmati Rice - 5kg',
        description: 'High quality basmati rice, aged for perfect aroma',
        listingType: 'product',
        price: 450,
        priceType: 'fixed',
        category: categories.find((c) => c.slug === 'grocery')._id,
        attributes: [
          { name: 'Weight', value: '5kg' },
          { name: 'Brand', value: 'India Gate' },
        ],
        stock: 50,
        createdBy: businessOwner._id,
        isActive: true,
      },
      {
        business: business._id,
        title: 'Fresh Milk - 1 Liter',
        description: 'Fresh and pure cow milk delivered daily',
        listingType: 'product',
        price: 60,
        priceType: 'fixed',
        category: categories.find((c) => c.slug === 'grocery')._id,
        attributes: [
          { name: 'Volume', value: '1 Liter' },
          { name: 'Type', value: 'Full Cream' },
        ],
        stock: 100,
        createdBy: businessOwner._id,
        isFeatured: true,
      },
      {
        business: business._id,
        title: 'Organic Atta - 10kg',
        description: 'Stone ground whole wheat flour, 100% organic',
        listingType: 'product',
        price: 550,
        priceType: 'fixed',
        category: categories.find((c) => c.slug === 'grocery')._id,
        attributes: [
          { name: 'Weight', value: '10kg' },
          { name: 'Type', value: 'Organic' },
        ],
        stock: 30,
        createdBy: businessOwner._id,
      },
    ];

    const listings = await Listing.insertMany(sampleListings);
    console.log(`✅ ${listings.length} listings created`);

    // Update business stats
    business.stats.totalListings = listings.length;
    await business.save();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║             ✅ DATABASE SEEDED SUCCESSFULLY ✅              ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Sample Credentials:');
    console.log('');
    console.log('   Admin:');
    console.log('   - Email: admin@apnidukan.com');
    console.log('   - Password: admin123');
    console.log('');
    console.log('   Business Owner:');
    console.log('   - Email: raj@example.com');
    console.log('   - Password: password123');
    console.log('');
    console.log(`📊 Data Created:`);
    console.log(`   - Users: 2`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Plans: ${plans.length}`);
    console.log(`   - Referral Offers: ${referralOffers.length}`);
    console.log(`   - Businesses: 1`);
    console.log(`   - Listings: ${listings.length}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
