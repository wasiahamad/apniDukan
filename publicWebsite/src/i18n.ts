import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "publicdukan:lang";
export type SupportedLanguage = "en" | "hi";

const getInitialLanguage = (): SupportedLanguage => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "hi" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return "en";
};                         

const resources = {
  en: {
    common: {
      brand: "PublicDukan",
      nav: {
        home: "Home",
        stories: "Stories",
        referral: "Referral Program",
        referralShort: "Referral",
        cities: "Cities",
        categories: "Categories",
        forBusiness: "For Business",
        forBusinessShort: "Business",
      },
      actions: {
        createShop: "Create Your Shop",
        login: "Login",
        signup: "Signup",
        logout: "Logout",
        help: "Help",
        settings: "Settings",
        viewAll: "View All",
      },

      filters: {
        all: "All",
        area: "Area",
        allAreas: "All Areas",
      },
      header: {
        signedOutTitle: "Signed out",
        signedOutDesc: "You have been logged out.",
        cities: {
          shopCount: "{{count}} shops",
          empty: "No cities yet",
        },
        categories: {
          empty: "No categories yet",
        },
        menu: {
          addAccount: "Add another account",
          profile: "Profile",
        },
      },
      search: {
        open: "Search shops...",
        inputPlaceholder: "Search shops, cities, categories...",
        noResults: "No results found.",
        cityShopCount: "{{count}} shops",
        headings: {
          shops: "Shops",
          cities: "Cities",
          categories: "Categories",
        },
        locationRequired: "Allow location access to find nearby shops.",
        kbdHint: "⌘K",
      },
      footer: {
        tagline: "India’s local business platform. Bring your shop online and reach more customers.",
        company: "Company",
        cities: "Cities",
        categories: "Categories",
        about: "About Us",
        pricing: "Pricing",
        contact: "Contact",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        referral: "Referral Program",
        copyright: "© 2026 PublicDukan. Made in India.",
      },
      language: {
        english: "English",
        hindi: "Hindi",
      },
      theme: {
        light: "Light",
        dark: "Dark",
        toggleToLight: "Switch to light theme",
        toggleToDark: "Switch to dark theme",
      },

      home: {
        hero: {
          badge: "🇮🇳 India's Local Business Platform",
          title: "Find <1>the Best</1> Shops<br />in Your <2>Neighborhood</2>",
          description:
            "Discover trusted shops in your area like salons, restaurants, grocery stores, and tailors — and connect directly via WhatsApp.",
          exploreNearby: "Explore Nearby Shops",
          registerShop: "Register Your Shop",
          stats: {
            shops: "{{count}} Shops",
            rating: "{{rating}} Rating",
            cities: "{{count}} Cities",
          },
        },
        howItWorks: {
          title: "How Does It Work 🤔?",
          stepLabel: "Step {{step}}",
          steps: {
            search: {
              title: "Search",
              desc: "Search by category or shop name near you",
            },
            view: {
              title: "View the shop",
              desc: "Check products, prices, ratings, and reviews",
            },
            contact: {
              title: "Contact directly",
              desc: "Connect instantly via WhatsApp, call, or directions",
            },
          },
        },

        featured: {
          title: "Featured Shops ⭐",
          noMatches: "No shops match your filters right now.",
          filters: {
            city: "City",
            allCities: "All Cities",
            businessType: "Business Type",
            allBusinessTypes: "All Business Types",
            openNowOnly: "Open now only",
          },
        },

        categories: {
          title: "Browse by Category",
        },

        more: {
          title: "More Shops",
          count: "{{count}} shops",
          none: "No more shops are available right now.",
        },

        cities: {
          title: "Browse by City 🏙️",
          mostActive: "Most Active",
        },

        cta: {
          title: "Bring Your Shop Online! 🚀",
          description:
            "Create a professional shop page in minutes. Take orders on WhatsApp and grow your customers.",
          registerShop: "Register Your Shop",
          createCustomer: "Create Customer Account",
        },
      },

      pricing: {
        title: "Simple, Transparent Plans",
        subtitle: "Choose a plan that fits your business. Start free and upgrade anytime.",
        unavailable: "Pricing is not available right now.",
        mostPopular: "Most Popular",
      },

      contact: {
        title: "Contact Us 📞",
        subtitle: "Have a question? Reach out anytime.",
        whatsapp: "WhatsApp",
        email: "Email",
        office: "Office",
        loading: "Loading...",
        form: {
          name: "Name",
          email: "Email",
          message: "Message",
          send: "Send Message",
          sending: "Sending...",
        },
        toast: {
          sentTitle: "✅ Message Sent!",
          sentDesc: "Thanks! Our team will get back to you soon.",
          failedTitle: "Failed to send",
          failedDesc: "Please try again.",
        },
      },

      aboutPage: {
        heading: "About publicdukan 🇮🇳",
        intro:
          "publicdukan is India’s growing local business discovery platform, built to bridge the gap between neighbourhood shops and digital-savvy customers.",
        cards: {
          mission: {
            title: "Our Mission",
            desc: "Bring every local shop online — simple, fast, and free.",
          },
          vision: {
            title: "Our Vision",
            desc: "Help 60M+ small businesses in India go digital.",
          },
          impact: {
            title: "Our Impact",
            desc: "10,000+ shops across 5 cities, connecting lakhs of customers.",
          },
          promise: {
            title: "Our Promise",
            desc: "Zero technical knowledge needed. Get your shop live in 10 minutes.",
          },
        },
        body:
          "We believe every chai wala, salon owner, kirana store, and tailor deserves the same digital tools as big brands. publicdukan makes it happen — with WhatsApp-first ordering, Google-friendly shop pages, and zero setup cost.",
        closing: "Built with ❤️ in India, for India’s local heroes.",
      },

      forBusinessPage: {
        hero: {
          title: "Take your <highlight>shop</highlight> online 🚀",
          subtitle:
            "India’s #1 local business platform. Start for free, take orders on WhatsApp, and grow your customer base.",
          cta: "Register Your Shop — Free",
        },
        problems: {
          title: "Facing these problems? 😟",
          p1: {
            title: "Not getting enough customers?",
            desc: "You have a shop, but people don’t know about it. Your online presence is near zero.",
          },
          p2: {
            title: "Is building a website difficult?",
            desc: "Hiring a developer is expensive and takes time.",
          },
          p3: {
            title: "Struggling to manage WhatsApp orders?",
            desc: "Customers message you, but everything feels unorganized.",
          },
        },
        solutions: {
          title: "Our solution ✅",
          s1: {
            title: "Free professional shop page",
            desc: "Create a beautiful page for your shop in 10 minutes — no coding required.",
          },
          s2: {
            title: "Direct WhatsApp orders",
            desc: "An ‘Order on WhatsApp’ button on every item. Customers connect instantly.",
          },
          s3: {
            title: "Get discovered on Google",
            desc: "Show up in Google Search — local SEO built in.",
          },
        },
        earnings: {
          title: "How much can you earn? 💰",
          exampleTitle: "Example: Salon Business",
          rows: {
            monthlyCustomers: "Monthly customers via publicdukan",
            avgOrderValue: "Average order value",
            extraMonthlyRevenue: "Extra Monthly Revenue",
            proPlanCost: "Pro Plan Cost",
            netProfit: "Net Profit",
          },
          perMonthSuffix: "/month",
        },
        pricing: {
          title: "Simple Pricing 💰",
          subtitle: "Choose the right plan for your business",
          mostPopular: "Most Popular",
        },
        plans: {
          free: {
            name: "Free",
            billingCycle: "forever",
            cta: "Start Free",
            features: {
              f1: "Basic shop listing",
              f2: "WhatsApp button",
              f3: "Google Maps listing",
              f4: "5 products/services",
              f5: "Basic analytics",
            },
          },
          pro: {
            name: "Pro",
            billingCycle: "month",
            cta: "Start Pro Trial",
            features: {
              f1: "Everything in Free",
              f2: "Verified badge ✅",
              f3: "Unlimited products",
              f4: "Priority listing",
              f5: "Custom shop page URL",
              f6: "Advanced analytics",
              f7: "WhatsApp catalog sync",
            },
          },
          premium: {
            name: "Premium",
            billingCycle: "month",
            cta: "Go Premium",
            features: {
              f1: "Everything in Pro",
              f2: "Featured in city page",
              f3: "Social media promotion",
              f4: "Dedicated account manager",
              f5: "Custom branding",
              f6: "Multi-location support",
              f7: "API access",
              f8: "Priority support",
            },
          },
        },
        finalCta: {
          title: "Ready to Grow? 🌟",
          subtitle: "Join 10,000+ local businesses already on publicdukan",
          primaryCta: "Register Now — It’s Free",
          secondaryCta: "View Pricing",
        },
      },

      termsPage: {
        title: "Terms of Service",
        lastUpdatedLabel: "Last updated:",
        lastUpdatedValue: "February 2026",
        sections: {
          acceptance: {
            title: "1. Acceptance of Terms",
            body: "By using publicdukan, you agree to these terms. If you do not agree, please do not use our platform.",
          },
          use: {
            title: "2. Use of Service",
            body: "publicdukan provides a platform for local businesses to create an online presence and connect with customers. You must provide accurate business information.",
          },
          responsibilities: {
            title: "3. User Responsibilities",
            body: "You are responsible for maintaining the accuracy of your business listing, responding to customer inquiries, and complying with applicable laws.",
          },
          ip: {
            title: "4. Intellectual Property",
            body: "All platform branding and assets are the property of publicdukan. Business owners retain rights to their own content.",
          },
          liability: {
            title: "5. Limitation of Liability",
            body: "publicdukan is not liable for transactions between businesses and customers. Transactions happen directly between the parties.",
          },
          contact: {
            title: "6. Contact",
            bodyPrefix: "Questions about these terms? Email us at",
          },
        },
      },

      privacyPolicyPage: {
        title: "Privacy Policy",
        lastUpdatedLabel: "Last updated:",
        lastUpdatedValue: "February 2026",
        sections: {
          collect: {
            title: "1. Information We Collect",
            body: "We collect information you provide directly, such as your name, email, phone number, and business details when you register on publicdukan.",
          },
          use: {
            title: "2. How We Use Information",
            body: "We use your information to provide, maintain, and improve our services, communicate with you, and display your business listing to potential customers.",
          },
          sharing: {
            title: "3. Information Sharing",
            body: "We do not sell your personal information. Business details you provide (shop name, address, phone) are displayed publicly on your shop page to help customers find you.",
          },
          security: {
            title: "4. Data Security",
            body: "We implement industry-standard security measures to protect your information from unauthorized access, alteration, or destruction.",
          },
          contact: {
            title: "5. Contact",
            bodyPrefix: "For privacy-related questions, contact us at",
          },
        },
      },

      notFound: {
        subtitle: "Oops! Page not found",
        backHome: "Return to Home",
      },

      categoriesPage: {
        subtitle: "Browse shops by selecting a category or city",
        browseByCategory: "Browse by Category",
        browseByCity: "Browse by City",
      },

      shopsPage: {
        all: {
          title: "All Shops",
          subtitle: "Browse verified shops from our platform.",
        },
        filters: {
          title: "Filters",
          searchPlaceholder: "Search by shop, category, city, or area",
          openNow: "Open Now",
          clear: "Clear",
        },
        errors: {
          failedToLoad: "Failed to load shops",
          backendHint: "Make sure the backend server is running and the Public Shops API is reachable, then try again.",
        },
        actions: {
          retry: "Retry",
        },
        empty: "No shops found. Try changing your search.",
        found: "{{count}} shops found",
      },

      shopPage: {
        generic: {
          somethingWentWrong: "Something went wrong",
          tryAgain: "Please try again.",
        },
        actions: {
          retry: "Retry",
          whatsapp: "WhatsApp",
          call: "Call",
          directions: "Directions",
          book: "Book",
          order: "Order",
          cancel: "Cancel",
          submitting: "Submitting...",
          share: "Share",
        },
        auth: {
          loginRequiredTitle: "Login required",
        },
        share: {
          defaultShareTitle: "PublicDukan",
          notPublicTitle: "Can’t share this link",
          notPublicDesc: "This is a local URL (localhost). Please try again with a public link.",
          copiedTitle: "Link copied",
          copyFailedTitle: "Copy failed",
        },
        owner: {
          fallbackName: "Owner",
        },
        customerFallbackLabel: "Customer",
        errors: {
          couldNotLoadShopTitle: "Couldn’t load shop",
        },
        notFound: {
          title: "Shop not found",
          backHome: "← Back to Home",
        },
        distance: {
          awayFromYou: "{{distance}} away from you",
        },
        status: {
          openNow: "Open now",
          closed: "Closed",
        },
        stories: {
          openStoriesAriaLabel: "Open stories",
          logoAriaLabel: "Shop logo",
        },
        listingsTitle: {
          food: "Food",
          course: "Courses",
          rental: "Rentals",
          service: "Services",
          product: "Products",
          default: "Listings",
        },
        listingType: {
          service: "Service",
          food: "Food",
          course: "Course",
          rental: "Rental",
          product: "Product",
        },
        productDialog: {
          soldBy: "Sold by {{shopName}}",
          noImage: "No image",
          descriptionTitle: "Description",
          descriptionMissingHindi: "Hindi description is not available yet.",
          autoDescriptionFallback: "To order this item, message on WhatsApp.",
          detailsTitle: "Details",
          chooseOptionTitle: "Choose option",
          durationLabel: "Duration",
          typeLabel: "Type",
          orderOnWhatsApp: "Order on WhatsApp",
          bookAppointment: "Book Appointment",
          whatsappPrefill: "Hi, I want to order {{item}} (₹{{price}}) from {{shopName}} via PublicDukan",
          whatsappOptionLine: "Option: {{option}}",
        },
        listings: {
          noFeatured: "No listings are available right now.",
        },
        whatsapp: {
          foundShopPrefill: "Hi, I found your shop on PublicDukan!",
          orderPrefill: "Hi, I want to order {{item}} (₹{{price}}) from PublicDukan.",
        },
        about: {
          title: "About",
          ownerLabel: "Owner",
          descriptionMissingHindi: "Hindi description is not available yet.",
          autoIntro: "This {{category}} is located in {{city}}. For orders or appointments, contact on WhatsApp or call.",
        },
        reviews: {
          title: "Reviews",
          writeButton: "Write a review",
          dialogTitle: "Write a review",
          yourRatingLabel: "Your rating",
          starAriaLabel: "{{value}} star",
          submittingAs: "Submitting as",
          customerFallback: "Customer",
          commentOptionalLabel: "Comment (optional)",
          commentPlaceholder: "Share your experience",
          submitButton: "Submit review",
          countLabel: "{{count}} reviews",
          ratingRequiredTitle: "Rating required",
          ratingRequiredDesc: "Please select a rating.",
          submittedTitle: "Review submitted",
          submittedDesc: "Thanks for your feedback!",
          loginRequiredDesc: "Please log in to write a review.",
          submitFailedTitle: "Failed to submit review",
          loadError: "Couldn’t load reviews. Please try again later.",
          empty: "No reviews yet. Be the first to write one.",
        },
        booking: {
          loginRequiredDesc: "Please log in to book an appointment.",
          dateRequiredTitle: "Please select a date",
          selectTimeSlotTitle: "Please select a time slot",
          selectValidFutureSlotTitle: "Please select a valid future time slot",
          confirmedTitle: "Booking confirmed",
          confirmedDesc: "Your booking has been created.",
          failedTitle: "Booking failed",
          dialogTitle: "Book an appointment",
          bookingAsLabel: "Booking as",
          profileDetailsFallback: "Profile details not available",
          itemServiceLabel: "Item / Service",
          selectItemPlaceholder: "Select an item",
          generalAppointmentOption: "General appointment",
          dateLabel: "Date",
          timeSlotLabel: "Time slot",
          selectDateToSeeSlots: "Select a date to see available slots.",
          loadingSlots: "Loading slots...",
          failedToLoadSlots: "Failed to load slots",
          noSlotsToday: "No slots available today",
          noSlotsForDate: "No slots available for this date",
          available: "Available",
          unavailable: "Unavailable",
          notesOptionalLabel: "Notes (optional)",
          notesPlaceholder: "Add notes for the business...",
          bookingInProgress: "Booking...",
          confirmBooking: "Confirm booking",
        },
        businessInfo: {
          title: "Business Info",
          websiteLabel: "Website link",
          weeklyOffLabel: "Weekly off",
        },
        location: {
          title: "Location",
          permissionDeniedHint: "Location permission denied — enable it to see distance & ETA.",
          openFullMap: "Open full map",
        },
        directions: {
          title: "Directions",
          iframeTitle: "Directions",
          openInGoogleMaps: "Open in Google Maps",
          stepsTitle: "Steps",
        },
      },

      cityPage: {
        title: "Shops in {{city}}",
        available: "{{count}} shops available",
        empty: "No shops found. Try adjusting filters.",
        sort: {
          highToLow: "Rating: High → Low",
          lowToHigh: "Rating: Low → High",
        },
        errors: {
          loadTitle: "Couldn’t load shops",
          generic: "Something went wrong",
        },
        notFound: {
          title: "City not found",
          backHome: "← Back to Home",
        },
      },

      categoryShopsPage: {
        breadcrumb: {
          shops: "Shops",
        },
        titleSuffix: "Shops",
        subtitle: "{{count}} shops found. Nearby shops are shown first.",
        empty: "No {{category}} shops found. Try adjusting filters.",
        errors: {
          loadTitle: "Couldn’t load shops",
          generic: "Something went wrong",
        },
        notFound: {
          title: "Page not found",
          backHome: "← Back to Home",
        },
      },

      storiesPage: {
        title: "Stories & Reels",
        subtitle: "Latest updates from nearby businesses.",
        sections: {
          stories: "Stories",
          reels: "Reels",
        },
        empty: {
          stories: "No active stories right now.",
          reels: "No reels uploaded yet.",
        },
        fallbackShop: "Shop",
        time: {
          justNow: "just now",
          minutesAgo: "{{count}}m ago",
          hoursAgo: "{{count}}h ago",
          daysAgo: "{{count}}d ago",
        },
        actions: {
          openLink: "Open link",
          close: "Close",
        },
      },

      referralProgramPage: {
        badge: "Referral Program",
        title: "Invite a shop owner. Earn commission.",
        subtitle:
          "Share your referral code with a business owner. If they sign up and purchase a paid plan, you may earn a commission credited to your wallet.",
        actions: {
          viewReferrals: "View My Referrals",
          createCustomer: "Create a Customer Account",
        },
        tip: "Tip: You’ll need to be logged in to view your referral code.",
        howItWorks: {
          title: "How it works",
          steps: {
            step1Prefix: "Go to",
            step1Strong: "Account → Referrals",
            step1Suffix: "to find your referral code.",
            step2: "Share the code with a shop owner who wants to register on publicdukan.",
            step3: "They enter your code during sign up.",
            step4Prefix: "If the referred business owner purchases a",
            step4Strong: "paid plan",
            step4Suffix: "your commission is calculated based on the active offer and credited to your wallet.",
          },
        },
        benefits: {
          title: "Benefits",
          items: {
            item1: "Earn commission when a referred business owner upgrades to a paid plan.",
            item2: "Track referrals, earnings, and wallet balance from your account.",
            item3: "Withdraw wallet balance by submitting a withdrawal request.",
          },
        },
        rules: {
          title: "Key rules (simple)",
          items: {
            item1Prefix: "Referral codes work only for",
            item1Strong: "customer",
            item1Suffix: "accounts.",
            item2: "Self-referrals are not allowed.",
            item3: "One business owner can be linked to only one customer referrer.",
            item4: "Commission is typically credited only when the referred owner purchases a paid plan.",
            item5: "Commission rates and offers can change over time.",
          },
        },
        faq: {
          title: "FAQs",
          q1: "Where do I find my code?",
          a1Prefix: "In your account under the",
          a1Strong: "Referrals",
          a1Suffix: "tab.",
          q2: "When do I get paid?",
          a2: "After the referred business owner purchases a paid plan and the commission is processed.",
          q3: "How do I withdraw?",
          a3Prefix: "Open",
          a3Strong: "Account → Wallet & Withdraw",
          a3Suffix: "and submit a withdrawal request.",
        },
        helpPrefix: "Need help? Reach us via the",
        helpLink: "Contact",
        helpSuffix: "page.",
      },

      auth: {
        validation: {
          nameRequired: "Name is required",
          emailRequired: "Email is required",
          emailInvalid: "Enter a valid email",
          passwordRequired: "Password is required",
          passwordMin: "Password must be at least 6 characters",
          confirmPasswordRequired: "Please confirm password",
          passwordMismatch: "Passwords do not match",
          phoneDigits10: "Phone number must be 10 digits",
          otpRequired: "OTP required",
          missingInfo: "Missing info",
          weakPassword: "Weak password",
        },
        toast: {
          successTitle: "Success",
          socialSuccessDesc: "Signed in with {{provider}}.",
          socialFailedTitle: "Social login failed",
        },
        login: {
          titleLogin: "Welcome Back",
          titleVerify: "Verify Email",
          titleForgot: "Reset Password",
          descLogin: "Login to manage your profile, bookings, and nearby shops.",
          descVerify: "Verify your email OTP before logging in.",
          descForgot: "We’ll send an OTP to your email to reset your password.",
          email: "Email",
          password: "Password",
          otp: "OTP",
          login: "Login",
          loggingIn: "Logging in...",
          rememberMe: "Remember me",
          verifyContinue: "Verify & Continue",
          verifying: "Verifying...",
          resendOtp: "Resend OTP",
          backToLogin: "Back to login",
          forgotPassword: "Forgot password?",
          sendOtp: "Send OTP",
          sending: "Sending...",
          resetPassword: "Reset Password",
          updating: "Updating...",
          newTo: "New to publicdukan?",
          createAccount: "Create an account",
          orContinueWith: "OR CONTINUE WITH",
          continueGoogle: "Continue with Google",
          continueFacebook: "Continue with Facebook",
          toast: {
            authRequiredTitle: "Login first",
            authRequiredDesc: "Please log in to view this page.",
            welcomeTitle: "Welcome back",
            welcomeDesc: "You are now logged in.",
            verifyEmailTitle: "Verify your email",
            verifyEmailDesc: "Please verify your email OTP before logging in.",
            loginFailedTitle: "Login failed",
            emailRequiredTitle: "Email required",
            emailRequiredDesc: "Please enter your email first.",
            otpRequiredTitle: "OTP required",
            otpRequiredDesc: "Please enter the OTP.",
            verifiedTitle: "Verified",
            verifiedDesc: "Email verified successfully.",
            verificationFailedTitle: "Verification failed",
            otpResentTitle: "OTP resent",
            otpResentDesc: "OTP has been sent to your email.",
            resendFailedTitle: "Resend failed",
            otpSentTitle: "OTP sent",
            otpSentDesc: "Reset OTP has been sent to your email.",
            failedTitle: "Failed",
            missingInfoDesc: "Email, OTP, and new password are required.",
            passwordUpdatedTitle: "Password updated",
            passwordUpdatedDesc: "You can now log in with your new password.",
          },
        },
        signup: {
          titleForm: "Create Account",
          titleVerify: "Verify Email",
          descForm: "Sign up to unlock your personal publicdukan dashboard.",
          otpNotePrefix: "We sent an OTP to",
          otpNoteSuffix: "",
          otpValidFor: "(valid for {{mins}} mins)",
          profilePreview: {
            title: "Profile preview",
            desc: "Your avatar initials appear after signup",
          },
          name: "Name",
          phoneOptional: "Phone (optional)",
          email: "Email",
          password: "Password",
          confirmPassword: "Confirm Password",
          otp: "OTP",
          enterOtp: "Enter OTP",
          alsoCheckSpam: "Also check your spam folder.",
          verifyContinue: "Verify & Continue",
          verifying: "Verifying...",
          resendOtp: "Resend OTP",
          resending: "Resending...",
          wrongEmail: "Wrong email?",
          changeSignupAgain: "Change & Signup again",
          signup: "Signup",
          creating: "Creating account...",
          alreadyHave: "Already have an account?",
          login: "Login",
          orContinueWith: "OR CONTINUE WITH",
          continueGoogle: "Continue with Google",
          continueFacebook: "Continue with Facebook",
          placeholderName: "Priya Sharma",
          placeholderPhone: "9876543210",
          placeholderEmail: "you@example.com",
          placeholderPassword: "Minimum 6 characters",
          toast: {
            otpSentTitle: "OTP sent",
            otpSentDesc: "Enter the OTP to verify your email.",
            accountCreatedTitle: "Account created",
            accountCreatedDesc: "Your profile is ready.",
            signupFailedTitle: "Signup failed",
            emailRequiredTitle: "Email required",
            emailRequiredDesc: "Email is missing. Please sign up again.",
            verificationFailedTitle: "Verification failed",
            verifiedTitle: "Email verified",
            verifiedDesc: "Your account has been verified.",
            resendFailedTitle: "Resend failed",
            otpResentTitle: "OTP resent",
            otpResentDesc: "A new OTP has been sent to your email.",
          },
        },

        layout: {
          tagline: "Discover local shops faster",
          title: "Local shopping, now with a premium mobile app vibe.",
          desc: "Sign in to manage bookings, live location, nearby shops, and your active plan.",
          features: {
            discovery: {
              label: "Smart Discovery",
              value: "Nearby First",
            },
            access: {
              label: "Fast Access",
              value: "1-Tap Booking",
            },
            note: "Built for speed, trust, and local growth.",
          },
        },
      },

      mobileDrawer: {
        title: "My Account",
        guest: {
          title: "Guest",
          desc: "Log in to manage bookings and location",
        },
        fallbackUser: "User",
      },

      account: {
        common: {
          yes: "Yes",
          no: "No",
          connecting: "Connecting...",
        },
        roles: {
          customer: "Customer",
          businessOwner: "Business Owner",
          admin: "Admin",
          staff: "Staff",
        },
        nav: {
          overview: "Profile Overview",
          location: "Live Location",
          bookings: "My Bookings",
          referrals: "Referrals",
          wallet: "Wallet & Withdraw",
          feedback: "Platform Feedback",
          settings: "Settings",
        },
        profile: {
          labels: {
            userId: "User ID",
            emailVerified: "Email verified",
          },
        },
        toasts: {
          successTitle: "Success",
          failedTitle: "Failed",
          authFailedTitle: "Authentication failed",
          welcomeTitle: "Welcome",
          welcomeDesc: "Customer session active.",
          passwordChangedTitle: "Password changed",
          passwordChangedDesc: "Your password has been updated successfully.",
        },
        auth: {
          customerOnlyNotice:
            "This panel is only for customer accounts. Business owner accounts cannot log in here.",
          panelDescRegister: "Sign up to manage your profile, bookings, and nearby shops.",
          panelDescLogin: "Login to manage your profile, bookings, and nearby shops.",
          fields: {
            mobileNumber: "Mobile Number",
          },
          errors: {
            customerOnly: "Only customer accounts are allowed to log in here",
            emailRequired: "Email required",
            phoneDigits10: "Mobile number must be 10 digits",
          },
          social: {
            signedInWith: "Signed in with {{provider}}.",
            failedGoogleTitle: "Google login failed",
            failedFacebookTitle: "Facebook login failed",
          },
          forgot: {
            inline: {
              otpSent: "OTP sent. Please check your inbox.",
              otpResent: "OTP has been resent.",
              verifyMissing: "Email, OTP, and a 6+ character new password are required",
              resetSuccessLogin: "Password reset successful. Please log in.",
            },
            toast: {
              otpSentTitle: "OTP sent",
              otpSentDesc: "Password reset OTP has been sent.",
              sendFailedTitle: "Failed to send reset OTP",
              otpResentTitle: "OTP resent",
              otpResentDesc: "Please check your inbox.",
              resendFailedTitle: "Failed to resend OTP",
              resetTitle: "Password reset",
              resetSignedInDesc: "Signed in successfully.",
              resetNowLoginDesc: "Now login with your new password.",
              resetFailedTitle: "Reset failed",
            },
          },
        },
        overview: {
          justNow: "Just now",
          phoneNotAdded: "Phone not added",
          active: "Active",
          inactive: "Inactive",
          verified: "Verified",
          unverified: "Unverified",
          totalBookings: "Total bookings",
          lastLogin: "Last login",
          locationStatus: "Location status",
          joinedOn: "Joined on {{date}}",
        },
        bookings: {
          title: "Bookings",
          desc: "Your recent bookings and appointments.",
          emptyTitle: "No bookings yet",
          emptyDesc: "When you book a service, it will show up here.",
          fallbackShop: "Shop",
          fallbackServiceBooking: "Service booking",
          dateNA: "N/A",
        },

        orders: {
          title: "Orders",
          desc: "Your recent orders from shop pages.",
          emptyTitle: "No orders yet",
          emptyDesc: "When you place an order, it will show up here.",
          fallbackShop: "Shop",
          orderLabel: "Order",
          orderIdLabel: "Order ID",
          totalLabel: "Total",
        },

        wallet: {
          title: "Wallet",
          desc: "Check your balance and request withdrawals.",
          currentBalance: "Current Balance",
          requestTitle: "Request Withdrawal",
          reasonLabel: "Reason:",
          sections: {
            withdrawalRequestsTitle: "Withdrawal Requests",
            noWithdrawalsYet: "No withdrawals yet.",
            recentTransactionsTitle: "Recent Transactions",
            noTransactionsYet: "No transactions yet.",
          },
          errors: {
            invalidAmount: "Please enter a valid amount",
            requestFailed: "Failed to request withdrawal",
          },
          messages: {
            submitted: "Withdrawal request submitted",
          },
          actions: {
            request: "Request Withdrawal",
            pleaseWait: "Please wait...",
          },
          form: {
            amount: "Amount",
            accountHolderName: "Account Holder Name",
            bankName: "Bank Name",
            accountNumber: "Account Number",
            ifsc: "IFSC Code",
          },
          placeholders: {
            amount: "e.g. 500",
            accountHolderName: "e.g. Priya Sharma",
            bankName: "e.g. SBI",
            accountNumber: "e.g. 1234567890",
            ifsc: "e.g. SBIN0000001",
          },
        },
        location: {
          title: "Live Location",
          desc: "Keep your location updated to discover nearby shops and services.",
          searchLabel: "Search",
          searchPlaceholder: "Search location (area, city, landmark)...",
          search: "Search",
          searching: "Searching...",
          tracking: "Tracking",
          detecting: "Detecting...",
          live: "Live",
          permissionDenied: "Permission denied",
          idle: "Idle",
          area: "Area",
          city: "City",
          state: "State",
          refresh: "Refresh Location",
          useDevice: "Use Device Location",
          save: "Save",
          saving: "Saving...",
          lastSynced: "Last synced: {{time}}",
          notSyncedYet: "Not synced yet",
          synced: "Synced",
          notSynced: "Not synced",
          mapMarkerTitle: "Your Location",
          errors: {
            invalidLatitude: "Latitude must be a valid value (-90 to 90)",
            invalidLatitudeTitle: "Invalid latitude",
            invalidLatitudeDesc: "Use a valid value between -90 and 90",
            invalidLongitude: "Longitude must be a valid value (-180 to 180)",
            invalidLongitudeTitle: "Invalid longitude",
            invalidLongitudeDesc: "Use a valid value between -180 and 180",
          },
          inline: {
            saved: "Location saved to your profile.",
          },
          toast: {
            updatedTitle: "Location updated",
            updatedDesc: "Your profile location was synced.",
            saveFailedTitle: "Location save failed",
            refreshingTitle: "Refreshing",
            refreshingDesc: "Requesting latest device location...",
            unavailableTitle: "Location unavailable",
            unavailableDesc: "Please allow location permission first.",
            deviceAppliedTitle: "Device location applied",
            deviceAppliedDesc: "Coordinates filled from your device.",
            noResultsTitle: "No results",
            noResultsDesc: "No location found for this search.",
            searchFailedTitle: "Search failed",
            searchFailedDesc: "Location search failed",
            selectedTitle: "Location selected",
            selectedDesc: "Location applied",
          },
        },
        settings: {
          title: "Settings",
          desc: "Manage your account details and security.",
          fields: {
            name: "Name",
            email: "Email",
            phone: "Phone",
            phoneNotAdded: "Phone not added",
          },
          profilePhoto: {
            label: "Profile photo",
            uploadChange: "Upload / Change",
          },
          note: "Some fields are managed by the account provider and cannot be edited here.",
          help: {
            title: "Need help?",
            desc: "For any issue, contact support and we’ll help you out.",
            contactSupport: "Contact Support",
          },
          logout: {
            title: "Logout",
            desc: "Sign out of your account on this device.",
            action: "Logout",
          },
          changePassword: {
            title: "Change password",
            fields: {
              current: "Current password",
              new: "New password",
              confirm: "Confirm new password",
            },
            placeholders: {
              current: "Enter current password",
              new: "Minimum 6 characters",
              confirm: "Re-enter new password",
            },
            actions: {
              change: "Change password",
              updating: "Updating...",
            },
            errors: {
              loginFirst: "Please login first",
              allRequired: "Old password, new password, and confirm password are required",
              min6: "New password must be at least 6 characters",
              mismatch: "New password and confirm password do not match",
              failed: "Failed to change password",
            },
            successMessage: "Password updated successfully.",
          },
        },
        profilePhoto: {
          sectionTitle: "Profile Photo",
          sectionDesc: "Upload a photo to personalize your profile.",
          actions: {
            uploadPhoto: "Upload photo",
            changePhoto: "Change photo",
            remove: "Remove",
          },
          errors: {
            invalidFileTitle: "Invalid file",
            invalidFileDesc: "Please choose an image file.",
            tooLargeTitle: "File too large",
            tooLargeDesc: "Please upload image under 2MB.",
          },
          toast: {
            updatedTitle: "Profile photo updated",
            updatedDesc: "Your new avatar is now visible.",
            uploadFailedTitle: "Upload failed",
            uploadFailedDesc: "Could not upload photo.",
            removedTitle: "Photo removed",
            removedDesc: "Initials avatar restored.",
            removeFailedTitle: "Remove failed",
            removeFailedDesc: "Could not remove photo.",
          },
        },
        feedback: {
          title: "Platform Feedback",
          desc: "Help us improve PublicDukan by sharing your experience.",
          form: {
            rating: "Rating",
            option5: "5 - Excellent",
            option4: "4 - Good",
            option3: "3 - Okay",
            option2: "2 - Bad",
            option1: "1 - Very bad",
            textLabel: "Feedback (optional)",
            textPlaceholder: "What should we improve?",
            maxChars: "Max {{count}} characters.",
          },
          actions: {
            submit: "Submit Feedback",
            submitting: "Submitting...",
          },
          errors: {
            loginFirst: "Please login first.",
            ratingRequired: "Please select a rating (1 to 5).",
          },
          inline: {
            submitted: "Thanks! Your feedback was submitted.",
            submitFailed: "Failed to submit feedback",
          },
          toast: {
            submittedTitle: "Feedback submitted",
            submittedDesc: "Thanks! Your feedback will appear in the admin panel.",
          },
        },
        referrals: {
          title: "Referrals",
          desc: "Share your code and earn from business registrations.",
          yourCode: "Your Referral Code",
          copy: "Copy",
          tip: "Tip: Ask the shop owner to apply this code during signup.",
          learnMore: "Learn more about the Referral Program",
          activeOffer: "Active offer: {{offerName}} • {{percent}}% commission",
          stats: {
            totalReferrals: "Total Referrals",
            totalEarnings: "Total Earnings",
            walletBalance: "Wallet Balance",
          },
          recentTitle: "Recent Referrals",
          emptyRecent: "No referral records yet.",
          fallbackReferredUser: "Dukandar",
          earned: "Earned: ₹{{amount}}",
          errors: {
            summaryLoad: "Couldn’t load the referral summary.",
          },
          toast: {
            copiedTitle: "Copied",
            copiedDesc: "Referral code copied",
            copyFailedTitle: "Copy failed",
            copyFailedDesc: "Please copy manually",
          },
        },
      },
    },
  },
  hi: {
    common: {
      brand: "PublicDukan",
      nav: {
        home: "होम",
        stories: "स्टोरीज़",
        referral: "रेफरल प्रोग्राम",
        referralShort: "रेफरल",
        cities: "शहर",
        categories: "श्रेणियाँ",
        forBusiness: "व्यवसाय के लिए",
        forBusinessShort: "व्यवसाय",
      },
      actions: {
        createShop: "अपनी दुकान बनाएं",
        login: "लॉगिन",
        signup: "साइन अप",
        logout: "लॉग आउट",
        help: "सहायता",
        settings: "सेटिंग्स",
        viewAll: "सभी देखें",
      },

      filters: {
        all: "सभी",
        area: "इलाका",
        allAreas: "सभी इलाके",
      },
      header: {
        signedOutTitle: "साइन आउट",
        signedOutDesc: "आप लॉग आउट हो गए हैं।",
        cities: {
          shopCount: "{{count}} दुकानें",
          empty: "अभी कोई शहर नहीं है",
        },
        categories: {
          empty: "अभी कोई श्रेणी नहीं है",
        },
        menu: {
          addAccount: "दूसरा अकाउंट जोड़ें",
          profile: "प्रोफ़ाइल",
        },
      },
      search: {
        open: "दुकानें खोजें…",
        inputPlaceholder: "दुकानें, शहर, श्रेणियाँ खोजें…",
        noResults: "कोई परिणाम नहीं मिला।",
        cityShopCount: "{{count}} दुकानें",
        headings: {
          shops: "दुकानें",
          cities: "शहर",
          categories: "श्रेणियाँ",
        },
        locationRequired: "पास की दुकानों के लिए लोकेशन की अनुमति दें।",
        kbdHint: "⌘K",
      },
      footer: {
        tagline: "भारत का स्थानीय व्यवसाय प्लेटफ़ॉर्म। अपनी दुकान को ऑनलाइन लाएं और ज़्यादा ग्राहकों तक पहुँचें।",
        company: "कंपनी",
        cities: "शहर",
        categories: "श्रेणियाँ",
        about: "हमारे बारे में",
        pricing: "प्लान",
        contact: "संपर्क",
        privacy: "गोपनीयता नीति",
        terms: "सेवा की शर्तें",
        referral: "रेफरल प्रोग्राम",
        copyright: "© 2026 PublicDukan. भारत में बनाया गया।",
      },
      language: {
        english: "अंग्रेज़ी",
        hindi: "हिंदी",
      },
      theme: {
        light: "लाइट",
        dark: "डार्क",
        toggleToLight: "लाइट थीम पर जाएँ",
        toggleToDark: "डार्क थीम पर जाएँ",
      },

      home: {
        hero: {
          badge: "🇮🇳 भारत का स्थानीय व्यवसाय प्लेटफ़ॉर्म",
          title: "अपने <2>इलाके</2> की <1>बेहतरीन</1> दुकानें<br />अपने आसपास",
          description:
            "अपने इलाके की भरोसेमंद दुकानें (सैलून, रेस्टोरेंट, किराना, दर्ज़ी) खोजें — और WhatsApp से सीधे जुड़ें।",
          exploreNearby: "पास की दुकानें देखें",
          registerShop: "अपनी दुकान रजिस्टर करें",
          stats: {
            shops: "{{count}} दुकानें",
            rating: "{{rating}} रेटिंग",
            cities: "{{count}} शहर",
          },
        },
        howItWorks: {
          title: "कैसे काम करता है 🤔?",
          stepLabel: "कदम {{step}}",
          steps: {
            search: {
              title: "खोजें",
              desc: "श्रेणी या दुकान के नाम से अपने आसपास खोजें",
            },
            view: {
              title: "दुकान देखें",
              desc: "प्रोडक्ट, कीमतें, रेटिंग और रिव्यू देखें",
            },
            contact: {
              title: "सीधा संपर्क",
              desc: "WhatsApp, कॉल या दिशा-निर्देश से तुरंत जुड़ें",
            },
          },
        },

        featured: {
          title: "चुनी हुई दुकानें ⭐",
          noMatches: "आपके फ़िल्टर के अनुसार अभी कोई दुकान नहीं मिली।",
          filters: {
            city: "शहर",
            allCities: "सभी शहर",
            businessType: "व्यवसाय प्रकार",
            allBusinessTypes: "सभी प्रकार",
            openNowOnly: "सिर्फ़ खुली दुकानें",
          },
        },

        categories: {
          title: "श्रेणी से ब्राउज़ करें",
        },

        more: {
          title: "और दुकानें",
          count: "{{count}} दुकानें",
          none: "अभी और दुकानें उपलब्ध नहीं हैं।",
        },

        cities: {
          title: "शहर के अनुसार ब्राउज़ करें 🏙️",
          mostActive: "सबसे सक्रिय",
        },

        cta: {
          title: "अपनी दुकान ऑनलाइन लाएं! 🚀",
          description:
            "कुछ ही मिनटों में प्रोफ़ेशनल दुकान पेज बनाएं। WhatsApp पर ऑर्डर लें और ग्राहक बढ़ाएं।",
          registerShop: "अपनी दुकान रजिस्टर करें",
          createCustomer: "ग्राहक अकाउंट बनाएं",
        },
      },

      pricing: {
        title: "सरल और पारदर्शी प्लान",
        subtitle: "अपने व्यवसाय के हिसाब से प्लान चुनें। फ्री से शुरू करें, कभी भी अपग्रेड करें।",
        unavailable: "अभी प्लान उपलब्ध नहीं हैं।",
        mostPopular: "सबसे लोकप्रिय",
      },

      contact: {
        title: "संपर्क करें 📞",
        subtitle: "कोई सवाल है? कभी भी संपर्क करें।",
        whatsapp: "WhatsApp",
        email: "ईमेल",
        office: "कार्यालय",
        loading: "लोड हो रहा है…",
        form: {
          name: "नाम",
          email: "ईमेल",
          message: "संदेश",
          send: "संदेश भेजें",
          sending: "भेजा जा रहा है…",
        },
        toast: {
          sentTitle: "✅ संदेश भेज दिया गया!",
          sentDesc: "धन्यवाद! टीम जल्द ही जवाब देगी।",
          failedTitle: "भेजने में विफल",
          failedDesc: "कृपया फिर से कोशिश करें।",
        },
      },

      aboutPage: {
        heading: "publicdukan के बारे में 🇮🇳",
        intro:
          "publicdukan भारत का बढ़ता हुआ लोकल बिज़नेस डिस्कवरी प्लेटफ़ॉर्म है, जो पड़ोस की दुकानों और डिजिटल ग्राहकों के बीच की दूरी कम करता है।",
        cards: {
          mission: {
            title: "हमारा मिशन",
            desc: "हर स्थानीय दुकान को ऑनलाइन लाना — सरल, तेज़ और मुफ़्त।",
          },
          vision: {
            title: "हमारा विज़न",
            desc: "भारत के 6 करोड़+ छोटे व्यवसायों को डिजिटल बनाने में मदद करना।",
          },
          impact: {
            title: "हमारा प्रभाव",
            desc: "5 शहरों में 10,000+ दुकानें — लाखों ग्राहकों को जोड़ते हुए।",
          },
          promise: {
            title: "हमारा वादा",
            desc: "कोई तकनीकी ज्ञान नहीं चाहिए। 10 मिनट में आपकी दुकान लाइव।",
          },
        },
        body:
          "हम मानते हैं कि हर चाय वाला, सैलून मालिक, किराना स्टोर और दर्ज़ी को बड़े ब्रांड्स जैसे डिजिटल टूल्स मिलने चाहिए। publicdukan इसे संभव बनाता है — WhatsApp-फ़र्स्ट ऑर्डरिंग, Google-फ्रेंडली दुकान पेज और बिना किसी सेटअप लागत के।",
        closing: "भारत में बना ❤️ — भारत के स्थानीय नायकों के लिए।",
      },

      forBusinessPage: {
        hero: {
          title: "अपनी <highlight>दुकान</highlight> को ऑनलाइन ले जाएँ 🚀",
          subtitle:
            "भारत का #1 लोकल बिज़नेस प्लेटफ़ॉर्म। मुफ़्त में शुरू करें, WhatsApp पर ऑर्डर लें, और अपने ग्राहक बढ़ाएँ।",
          cta: "अपनी दुकान रजिस्टर करें — मुफ़्त",
        },
        problems: {
          title: "क्या ये समस्याएँ आ रही हैं? 😟",
          p1: {
            title: "पर्याप्त ग्राहक नहीं मिल रहे?",
            desc: "आपकी दुकान है, लेकिन लोगों को पता नहीं। आपकी ऑनलाइन मौजूदगी लगभग शून्य है।",
          },
          p2: {
            title: "क्या वेबसाइट बनाना मुश्किल लगता है?",
            desc: "डेवलपर रखना महंगा होता है और समय भी लगता है।",
          },
          p3: {
            title: "WhatsApp ऑर्डर संभालना मुश्किल?",
            desc: "ग्राहक मैसेज करते हैं, लेकिन सब कुछ अव्यवस्थित लगने लगता है।",
          },
        },
        solutions: {
          title: "हमारा समाधान ✅",
          s1: {
            title: "मुफ़्त प्रोफ़ेशनल दुकान पेज",
            desc: "10 मिनट में अपनी दुकान के लिए एक सुंदर पेज बनाएं — बिना कोडिंग के।",
          },
          s2: {
            title: "सीधे WhatsApp ऑर्डर",
            desc: "हर आइटम पर ‘WhatsApp पर ऑर्डर’ बटन। ग्राहक तुरंत जुड़ते हैं।",
          },
          s3: {
            title: "Google पर दिखें",
            desc: "Google Search में दिखाई दें — लोकल SEO पहले से शामिल।",
          },
        },
        earnings: {
          title: "आप कितनी कमाई कर सकते हैं? 💰",
          exampleTitle: "उदाहरण: सैलून बिज़नेस",
          rows: {
            monthlyCustomers: "publicdukan से महीने में ग्राहक",
            avgOrderValue: "औसत बिल राशि",
            extraMonthlyRevenue: "अतिरिक्त मासिक आय",
            proPlanCost: "Pro प्लान खर्च",
            netProfit: "शुद्ध लाभ",
          },
          perMonthSuffix: "/माह",
        },
        pricing: {
          title: "सरल प्राइसिंग 💰",
          subtitle: "अपने व्यवसाय के लिए सही प्लान चुनें",
          mostPopular: "सबसे लोकप्रिय",
        },
        plans: {
          free: {
            name: "Free",
            billingCycle: "हमेशा",
            cta: "मुफ़्त में शुरू करें",
            features: {
              f1: "बेसिक दुकान लिस्टिंग",
              f2: "WhatsApp बटन",
              f3: "Google Maps लिस्टिंग",
              f4: "5 प्रोडक्ट/सेवाएँ",
              f5: "बेसिक एनालिटिक्स",
            },
          },
          pro: {
            name: "Pro",
            billingCycle: "माह",
            cta: "Pro ट्रायल शुरू करें",
            features: {
              f1: "Free के सभी फ़ीचर",
              f2: "वेरिफ़ाइड बैज ✅",
              f3: "असीमित प्रोडक्ट",
              f4: "प्रायोरिटी लिस्टिंग",
              f5: "कस्टम दुकान पेज URL",
              f6: "एडवांस्ड एनालिटिक्स",
              f7: "WhatsApp कैटलॉग सिंक",
            },
          },
          premium: {
            name: "Premium",
            billingCycle: "माह",
            cta: "Premium लें",
            features: {
              f1: "Pro के सभी फ़ीचर",
              f2: "शहर पेज पर फ़ीचर्ड",
              f3: "सोशल मीडिया प्रमोशन",
              f4: "डेडिकेटेड अकाउंट मैनेजर",
              f5: "कस्टम ब्रांडिंग",
              f6: "मल्टी-लोकेशन सपोर्ट",
              f7: "API एक्सेस",
              f8: "प्रायोरिटी सपोर्ट",
            },
          },
        },
        finalCta: {
          title: "बढ़ने के लिए तैयार हैं? 🌟",
          subtitle: "10,000+ स्थानीय व्यवसायों के साथ जुड़ें जो पहले से publicdukan पर हैं",
          primaryCta: "अभी रजिस्टर करें — मुफ़्त",
          secondaryCta: "प्लान देखें",
        },
      },

      termsPage: {
        title: "सेवा की शर्तें",
        lastUpdatedLabel: "अंतिम अपडेट:",
        lastUpdatedValue: "फ़रवरी 2026",
        sections: {
          acceptance: {
            title: "1. शर्तों की स्वीकृति",
            body: "publicdukan का उपयोग करके आप इन शर्तों से सहमत होते हैं। यदि आप सहमत नहीं हैं, तो कृपया प्लेटफ़ॉर्म का उपयोग न करें।",
          },
          use: {
            title: "2. सेवा का उपयोग",
            body: "publicdukan स्थानीय व्यवसायों को ऑनलाइन मौजूदगी बनाने और ग्राहकों से जुड़ने के लिए एक प्लेटफ़ॉर्म प्रदान करता है। कृपया सही और अपडेटेड जानकारी दें।",
          },
          responsibilities: {
            title: "3. उपयोगकर्ता की जिम्मेदारियाँ",
            body: "आप अपनी लिस्टिंग की सटीकता बनाए रखने, ग्राहक पूछताछ का जवाब देने और लागू कानूनों का पालन करने के लिए जिम्मेदार हैं।",
          },
          ip: {
            title: "4. बौद्धिक संपदा",
            body: "प्लेटफ़ॉर्म की ब्रांडिंग और एसेट्स publicdukan की संपत्ति हैं। व्यवसाय मालिक अपने कंटेंट के अधिकार रखते हैं।",
          },
          liability: {
            title: "5. दायित्व की सीमा",
            body: "publicdukan व्यवसाय और ग्राहक के बीच होने वाले लेन-देन के लिए जिम्मेदार नहीं है। लेन-देन सीधे दोनों पक्षों के बीच होता है।",
          },
          contact: {
            title: "6. संपर्क",
            bodyPrefix: "इन शर्तों से जुड़े प्रश्न? हमें ईमेल करें:",
          },
        },
      },

      privacyPolicyPage: {
        title: "गोपनीयता नीति",
        lastUpdatedLabel: "अंतिम अपडेट:",
        lastUpdatedValue: "फ़रवरी 2026",
        sections: {
          collect: {
            title: "1. हम कौन-सी जानकारी एकत्र करते हैं",
            body: "हम वह जानकारी एकत्र करते हैं जो आप सीधे देते हैं, जैसे नाम, ईमेल, फ़ोन नंबर और व्यवसाय विवरण — जब आप publicdukan पर रजिस्टर करते हैं।",
          },
          use: {
            title: "2. हम जानकारी का उपयोग कैसे करते हैं",
            body: "हम आपकी जानकारी का उपयोग सेवाएँ प्रदान करने, बनाए रखने और बेहतर करने, आपसे संपर्क करने, और आपकी दुकान की जानकारी ग्राहकों तक दिखाने के लिए करते हैं।",
          },
          sharing: {
            title: "3. जानकारी साझा करना",
            body: "हम आपकी व्यक्तिगत जानकारी नहीं बेचते। आपके द्वारा दिए गए व्यवसाय विवरण (दुकान का नाम, पता, फ़ोन) ग्राहकों को आपको खोजने में मदद करने के लिए आपके शॉप पेज पर सार्वजनिक रूप से दिखाए जाते हैं।",
          },
          security: {
            title: "4. डेटा सुरक्षा",
            body: "हम अनधिकृत पहुँच, बदलाव या नुकसान से आपकी जानकारी की सुरक्षा के लिए उद्योग-मानक सुरक्षा उपाय लागू करते हैं।",
          },
          contact: {
            title: "5. संपर्क",
            bodyPrefix: "गोपनीयता से जुड़े प्रश्नों के लिए संपर्क करें:",
          },
        },
      },

      notFound: {
        subtitle: "ओह! पेज नहीं मिला",
        backHome: "होम पर वापस जाएँ",
      },

      categoriesPage: {
        subtitle: "श्रेणी या शहर चुनकर दुकानें ब्राउज़ करें",
        browseByCategory: "श्रेणी से ब्राउज़ करें",
        browseByCity: "शहर से ब्राउज़ करें",
      },

      shopsPage: {
        all: {
          title: "सभी दुकानें",
          subtitle: "प्लैटफ़ॉर्म की सत्यापित दुकानें देखें।",
        },
        filters: {
          title: "फ़िल्टर",
          searchPlaceholder: "दुकान, श्रेणी, शहर या इलाके से खोजें",
          openNow: "अभी खुला",
          clear: "क्लियर",
        },
        errors: {
          failedToLoad: "दुकानें लोड नहीं हो सकीं",
          backendHint:
            "सुनिश्चित करें कि बैकएंड सर्वर चल रहा है और Public Shops API उपलब्ध है, फिर कोशिश करें।",
        },
        actions: {
          retry: "फिर से कोशिश करें",
        },
        empty: "कोई दुकान नहीं मिली। खोज बदलकर देखें।",
        found: "{{count}} दुकानें मिलीं",
      },

      shopPage: {
        generic: {
          somethingWentWrong: "कुछ गलत हो गया",
          tryAgain: "कृपया फिर से कोशिश करें।",
        },
        actions: {
          retry: "फिर से कोशिश करें",
          whatsapp: "WhatsApp",
          call: "कॉल करें",
          directions: "दिशा-निर्देश",
          book: "बुक करें",
          order: "ऑर्डर करें",
          cancel: "रद्द करें",
          submitting: "सबमिट हो रहा है…",
          share: "शेयर करें",
        },
        auth: {
          loginRequiredTitle: "लॉगिन आवश्यक",
        },
        share: {
          defaultShareTitle: "PublicDukan",
          notPublicTitle: "यह लिंक शेयर नहीं हो सकता",
          notPublicDesc: "यह लोकल URL (localhost) है। कृपया पब्लिक लिंक के साथ फिर से कोशिश करें।",
          copiedTitle: "लिंक कॉपी हो गया",
          copyFailedTitle: "कॉपी नहीं हो पाया",
        },
        owner: {
          fallbackName: "मालिक",
        },
        customerFallbackLabel: "ग्राहक",
        errors: {
          couldNotLoadShopTitle: "दुकान लोड नहीं हो सकी",
        },
        notFound: {
          title: "दुकान नहीं मिली",
          backHome: "← होम पर वापस",
        },
        distance: {
          awayFromYou: "आपसे {{distance}} दूर",
        },
        status: {
          openNow: "अभी खुला",
          closed: "बंद",
        },
        stories: {
          openStoriesAriaLabel: "स्टोरीज़ खोलें",
          logoAriaLabel: "दुकान का लोगो",
        },
        listingsTitle: {
          food: "खाना",
          course: "कोर्स",
          rental: "किराये पर",
          service: "सेवाएँ",
          product: "प्रोडक्ट",
          default: "लिस्टिंग",
        },
        listingType: {
          service: "सेवा",
          food: "खाना",
          course: "कोर्स",
          rental: "किराया",
          product: "प्रोडक्ट",
        },
        productDialog: {
          soldBy: "{{shopName}} द्वारा",
          noImage: "कोई इमेज नहीं",
          descriptionTitle: "विवरण",
          descriptionMissingHindi: "हिंदी में विवरण अभी उपलब्ध नहीं है।",
          autoDescriptionFallback: "इस आइटम का ऑर्डर करने के लिए WhatsApp पर संदेश भेजें।",
          detailsTitle: "जानकारी",
          chooseOptionTitle: "विकल्प चुनें",
          durationLabel: "अवधि",
          typeLabel: "प्रकार",
          orderOnWhatsApp: "WhatsApp पर ऑर्डर करें",
          bookAppointment: "अपॉइंटमेंट बुक करें",
          whatsappPrefill: "नमस्ते, मैं PublicDukan से {{shopName}} के यहाँ से {{item}} (₹{{price}}) ऑर्डर करना चाहता/चाहती हूँ",
          whatsappOptionLine: "विकल्प: {{option}}",
        },
        listings: {
          noFeatured: "अभी कोई लिस्टिंग उपलब्ध नहीं है।",
        },
        whatsapp: {
          foundShopPrefill: "नमस्ते, मुझे आपकी दुकान PublicDukan पर मिली!",
          orderPrefill: "नमस्ते, मैं PublicDukan से {{item}} (₹{{price}}) ऑर्डर करना चाहता/चाहती हूँ।",
        },
        about: {
          title: "परिचय",
          ownerLabel: "मालिक",
          descriptionMissingHindi: "हिंदी में विवरण अभी उपलब्ध नहीं है।",
          autoIntro: "यह {{city}} में स्थित {{category}} है। ऑर्डर/बुकिंग के लिए WhatsApp या कॉल करें।",
        },
        reviews: {
          title: "रिव्यू",
          writeButton: "रिव्यू लिखें",
          dialogTitle: "रिव्यू लिखें",
          yourRatingLabel: "आपकी रेटिंग",
          starAriaLabel: "{{value}} स्टार",
          submittingAs: "इस नाम से सबमिट हो रहा है",
          customerFallback: "ग्राहक",
          commentOptionalLabel: "कमेंट (वैकल्पिक)",
          commentPlaceholder: "अपना अनुभव साझा करें",
          submitButton: "रिव्यू सबमिट करें",
          countLabel: "{{count}} रिव्यू",
          ratingRequiredTitle: "रेटिंग आवश्यक",
          ratingRequiredDesc: "कृपया रेटिंग चुनें।",
          submittedTitle: "रिव्यू सबमिट हो गया",
          submittedDesc: "आपके फ़ीडबैक के लिए धन्यवाद!",
          loginRequiredDesc: "रिव्यू लिखने के लिए कृपया लॉगिन करें।",
          submitFailedTitle: "रिव्यू सबमिट नहीं हो पाया",
          loadError: "रिव्यू लोड नहीं हो सके। कृपया बाद में फिर से कोशिश करें।",
          empty: "अभी कोई रिव्यू नहीं है। पहला रिव्यू आप लिखें।",
        },
        booking: {
          loginRequiredDesc: "अपॉइंटमेंट बुक करने के लिए कृपया लॉगिन करें।",
          dateRequiredTitle: "कृपया तारीख चुनें",
          selectTimeSlotTitle: "कृपया टाइम स्लॉट चुनें",
          selectValidFutureSlotTitle: "कृपया भविष्य का सही टाइम स्लॉट चुनें",
          confirmedTitle: "बुकिंग कन्फर्म हो गई",
          confirmedDesc: "आपकी बुकिंग बन गई है।",
          failedTitle: "बुकिंग नहीं हो पाई",
          dialogTitle: "अपॉइंटमेंट बुक करें",
          bookingAsLabel: "इस नाम से बुकिंग",
          profileDetailsFallback: "प्रोफ़ाइल विवरण उपलब्ध नहीं",
          itemServiceLabel: "आइटम / सेवा",
          selectItemPlaceholder: "आइटम चुनें",
          generalAppointmentOption: "सामान्य अपॉइंटमेंट",
          dateLabel: "तारीख",
          timeSlotLabel: "टाइम स्लॉट",
          selectDateToSeeSlots: "उपलब्ध स्लॉट देखने के लिए तारीख चुनें।",
          loadingSlots: "स्लॉट लोड हो रहे हैं…",
          failedToLoadSlots: "स्लॉट लोड नहीं हो सके",
          noSlotsToday: "आज कोई स्लॉट उपलब्ध नहीं",
          noSlotsForDate: "इस तारीख के लिए कोई स्लॉट उपलब्ध नहीं",
          available: "उपलब्ध",
          unavailable: "अनुपलब्ध",
          notesOptionalLabel: "नोट्स (वैकल्पिक)",
          notesPlaceholder: "व्यवसाय के लिए नोट्स जोड़ें…",
          bookingInProgress: "बुक हो रहा है…",
          confirmBooking: "बुकिंग कन्फर्म करें",
        },
        businessInfo: {
          title: "व्यवसाय जानकारी",
          websiteLabel: "वेबसाइट लिंक",
          weeklyOffLabel: "साप्ताहिक अवकाश",
        },
        location: {
          title: "लोकेशन",
          permissionDeniedHint: "लोकेशन अनुमति नहीं मिली — दूरी और ETA देखने के लिए इसे सक्षम करें।",
          openFullMap: "पूरा मैप खोलें",
        },
        directions: {
          title: "दिशा-निर्देश",
          iframeTitle: "दिशा-निर्देश",
          openInGoogleMaps: "Google Maps में खोलें",
          stepsTitle: "स्टेप्स",
        },
      },

      cityPage: {
        title: "{{city}} में दुकानें",
        available: "{{count}} दुकानें उपलब्ध",
        empty: "कोई दुकान नहीं मिली। फ़िल्टर बदलकर देखें।",
        sort: {
          highToLow: "रेटिंग: अधिक → कम",
          lowToHigh: "रेटिंग: कम → अधिक",
        },
        errors: {
          loadTitle: "दुकानें लोड नहीं हो सकीं",
          generic: "कुछ गलत हो गया",
        },
        notFound: {
          title: "शहर नहीं मिला",
          backHome: "← होम पर वापस",
        },
      },

      categoryShopsPage: {
        breadcrumb: {
          shops: "दुकानें",
        },
        titleSuffix: "दुकानें",
        subtitle: "{{count}} दुकानें मिलीं। पास की दुकानें पहले दिखाई जाती हैं।",
        empty: "{{category}} में कोई दुकान नहीं मिली। फ़िल्टर बदलकर देखें।",
        errors: {
          loadTitle: "दुकानें लोड नहीं हो सकीं",
          generic: "कुछ गलत हो गया",
        },
        notFound: {
          title: "पेज नहीं मिला",
          backHome: "← होम पर वापस",
        },
      },

      storiesPage: {
        title: "स्टोरीज़ और रील्स",
        subtitle: "पास के व्यवसायों के नए अपडेट।",
        sections: {
          stories: "स्टोरीज़",
          reels: "रील्स",
        },
        empty: {
          stories: "अभी कोई स्टोरी सक्रिय नहीं है।",
          reels: "अभी तक कोई रील अपलोड नहीं हुई।",
        },
        fallbackShop: "दुकान",
        time: {
          justNow: "अभी-अभी",
          minutesAgo: "{{count}} मिनट पहले",
          hoursAgo: "{{count}} घंटे पहले",
          daysAgo: "{{count}} दिन पहले",
        },
        actions: {
          openLink: "लिंक खोलें",
          close: "बंद करें",
        },
      },

      referralProgramPage: {
        badge: "रेफरल प्रोग्राम",
        title: "दुकानदार को आमंत्रित करें। कमीशन कमाएं।",
        subtitle:
          "अपना रेफरल कोड किसी व्यवसाय मालिक के साथ साझा करें। यदि वे साइन अप करके पेड प्लान खरीदते हैं, तो आपको कमीशन मिल सकता है जो आपके वॉलेट में क्रेडिट होता है।",
        actions: {
          viewReferrals: "मेरे रेफरल देखें",
          createCustomer: "ग्राहक अकाउंट बनाएं",
        },
        tip: "टिप: रेफरल कोड देखने के लिए लॉगिन होना ज़रूरी है।",
        howItWorks: {
          title: "कैसे काम करता है",
          steps: {
            step1Prefix: "जाएँ",
            step1Strong: "अकाउंट → रेफरल",
            step1Suffix: "में और अपना रेफरल कोड देखें।",
            step2: "कोड उस दुकानदार के साथ साझा करें जो publicdukan पर रजिस्टर करना चाहता है।",
            step3: "वे साइन अप के समय आपका कोड दर्ज करते हैं।",
            step4Prefix: "यदि रेफर किए गए व्यवसाय मालिक",
            step4Strong: "पेड प्लान",
            step4Suffix:
              "खरीदते हैं, तो कमीशन सक्रिय ऑफ़र के अनुसार गणना होकर आपके वॉलेट में क्रेडिट होता है।",
          },
        },
        benefits: {
          title: "फायदे",
          items: {
            item1: "रेफर किया गया व्यवसाय मालिक पेड प्लान अपग्रेड करे तो कमीशन कमाएं।",
            item2: "अपने अकाउंट से रेफरल, कमाई और वॉलेट बैलेंस ट्रैक करें।",
            item3: "विड्रॉ रिक्वेस्ट सबमिट करके वॉलेट बैलेंस निकालें।",
          },
        },
        rules: {
          title: "मुख्य नियम (सरल)",
          items: {
            item1Prefix: "रेफरल कोड केवल",
            item1Strong: "ग्राहक",
            item1Suffix: "अकाउंट के लिए काम करते हैं।",
            item2: "खुद को रेफर करना अनुमति नहीं है।",
            item3: "एक व्यवसाय मालिक केवल एक ग्राहक रेफरर से जुड़ सकता है।",
            item4: "कमीशन आमतौर पर तभी क्रेडिट होता है जब रेफर किया गया मालिक पेड प्लान खरीदता है।",
            item5: "कमीशन दरें और ऑफ़र समय के साथ बदल सकते हैं।",
          },
        },
        faq: {
          title: "अक्सर पूछे जाने वाले सवाल",
          q1: "मेरा कोड कहाँ मिलेगा?",
          a1Prefix: "अपने अकाउंट में",
          a1Strong: "रेफरल",
          a1Suffix: "टैब के अंदर।",
          q2: "भुगतान कब मिलेगा?",
          a2: "जब रेफर किया गया व्यवसाय मालिक पेड प्लान खरीदे और कमीशन प्रोसेस हो जाए।",
          q3: "विड्रॉ कैसे करूँ?",
          a3Prefix: "खोलें",
          a3Strong: "अकाउंट → वॉलेट और विड्रॉ",
          a3Suffix: "और विड्रॉ रिक्वेस्ट सबमिट करें।",
        },
        helpPrefix: "मदद चाहिए?",
        helpLink: "संपर्क",
        helpSuffix: "पेज पर आएँ।",
      },

      auth: {
        validation: {
          nameRequired: "नाम आवश्यक है",
          emailRequired: "ईमेल आवश्यक है",
          emailInvalid: "मान्य ईमेल दर्ज करें",
          passwordRequired: "पासवर्ड आवश्यक है",
          passwordMin: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
          confirmPasswordRequired: "कृपया पासवर्ड की पुष्टि करें",
          passwordMismatch: "पासवर्ड मेल नहीं खाते",
          phoneDigits10: "फोन नंबर 10 अंकों का होना चाहिए",
          otpRequired: "OTP आवश्यक है",
          missingInfo: "जानकारी अधूरी है",
          weakPassword: "कमज़ोर पासवर्ड",
        },
        toast: {
          successTitle: "सफल",
          socialSuccessDesc: "{{provider}} से साइन इन हो गया।",
          socialFailedTitle: "सोशल लॉगिन विफल",
        },
        login: {
          titleLogin: "वापसी पर स्वागत है",
          titleVerify: "ईमेल सत्यापित करें",
          titleForgot: "पासवर्ड रीसेट करें",
          descLogin: "अपनी प्रोफ़ाइल, बुकिंग और पास की दुकानें मैनेज करने के लिए लॉगिन करें।",
          descVerify: "लॉगिन से पहले ईमेल OTP सत्यापित करें।",
          descForgot: "पासवर्ड रीसेट के लिए आपके ईमेल पर OTP भेजेंगे।",
          email: "ईमेल",
          password: "पासवर्ड",
          otp: "OTP",
          login: "लॉगिन",
          loggingIn: "लॉगिन हो रहा है…",
          rememberMe: "मुझे याद रखें",
          verifyContinue: "सत्यापित करें और आगे बढ़ें",
          verifying: "सत्यापित हो रहा है…",
          resendOtp: "OTP फिर से भेजें",
          backToLogin: "लॉगिन पर वापस",
          forgotPassword: "पासवर्ड भूल गए?",
          sendOtp: "OTP भेजें",
          sending: "भेजा जा रहा है…",
          resetPassword: "पासवर्ड रीसेट करें",
          updating: "अपडेट हो रहा है…",
          newTo: "publicdukan पर नए हैं?",
          createAccount: "अकाउंट बनाएं",
          orContinueWith: "या इसके साथ जारी रखें",
          continueGoogle: "Google से जारी रखें",
          continueFacebook: "Facebook से जारी रखें",
          toast: {
            authRequiredTitle: "पहले लॉगिन करें",
            authRequiredDesc: "यह पेज देखने के लिए लॉगिन करें।",
            welcomeTitle: "वापसी पर स्वागत है",
            welcomeDesc: "आप लॉगिन हो गए हैं।",
            verifyEmailTitle: "अपना ईमेल सत्यापित करें",
            verifyEmailDesc: "लॉगिन से पहले ईमेल OTP सत्यापित करें।",
            loginFailedTitle: "लॉगिन विफल",
            emailRequiredTitle: "ईमेल आवश्यक है",
            emailRequiredDesc: "कृपया पहले अपना ईमेल दर्ज करें।",
            otpRequiredTitle: "OTP आवश्यक है",
            otpRequiredDesc: "कृपया OTP दर्ज करें।",
            verifiedTitle: "सत्यापित",
            verifiedDesc: "ईमेल सफलतापूर्वक सत्यापित हो गया।",
            verificationFailedTitle: "सत्यापन विफल",
            otpResentTitle: "OTP फिर से भेजा गया",
            otpResentDesc: "OTP आपके ईमेल पर भेज दिया गया है।",
            resendFailedTitle: "फिर से भेजना विफल",
            otpSentTitle: "OTP भेजा गया",
            otpSentDesc: "रीसेट OTP ईमेल पर भेज दिया गया।",
            failedTitle: "विफल",
            missingInfoDesc: "ईमेल, OTP और नया पासवर्ड आवश्यक हैं।",
            passwordUpdatedTitle: "पासवर्ड अपडेट हुआ",
            passwordUpdatedDesc: "अब आप नए पासवर्ड से लॉगिन कर सकते हैं।",
          },
        },
        signup: {
          titleForm: "अकाउंट बनाएं",
          titleVerify: "ईमेल सत्यापित करें",
          descForm: "अपना पर्सनल publicdukan डैशबोर्ड अनलॉक करने के लिए साइन अप करें।",
          otpNotePrefix: "हमने OTP भेजा है:",
          otpNoteSuffix: "",
          otpValidFor: "({{mins}} मिनट के लिए मान्य)",
          profilePreview: {
            title: "प्रोफ़ाइल पूर्वावलोकन",
            desc: "साइन अप के बाद आपके अवतार में शुरुआती अक्षर दिखेंगे",
          },
          name: "नाम",
          phoneOptional: "फोन (वैकल्पिक)",
          email: "ईमेल",
          password: "पासवर्ड",
          confirmPassword: "पासवर्ड की पुष्टि",
          otp: "OTP",
          enterOtp: "OTP दर्ज करें",
          alsoCheckSpam: "स्पैम फ़ोल्डर भी देख लें।",
          verifyContinue: "सत्यापित करें और आगे बढ़ें",
          verifying: "सत्यापित हो रहा है…",
          resendOtp: "OTP फिर से भेजें",
          resending: "फिर से भेजा जा रहा है…",
          wrongEmail: "गलत ईमेल?",
          changeSignupAgain: "बदलें और फिर से साइन अप करें",
          signup: "साइन अप",
          creating: "अकाउंट बनाया जा रहा है…",
          alreadyHave: "पहले से अकाउंट है?",
          login: "लॉगिन",
          orContinueWith: "या इसके साथ जारी रखें",
          continueGoogle: "Google से जारी रखें",
          continueFacebook: "Facebook से जारी रखें",
          placeholderName: "Priya Sharma",
          placeholderPhone: "9876543210",
          placeholderEmail: "you@example.com",
          placeholderPassword: "कम से कम 6 अक्षर",
          toast: {
            otpSentTitle: "OTP भेजा गया",
            otpSentDesc: "ईमेल सत्यापित करने के लिए OTP दर्ज करें।",
            accountCreatedTitle: "अकाउंट बन गया",
            accountCreatedDesc: "आपकी प्रोफ़ाइल तैयार है।",
            signupFailedTitle: "साइन अप विफल",
            emailRequiredTitle: "ईमेल आवश्यक है",
            emailRequiredDesc: "ईमेल नहीं मिला। फिर से साइन अप करें।",
            verificationFailedTitle: "सत्यापन विफल",
            verifiedTitle: "ईमेल सत्यापित",
            verifiedDesc: "आपका अकाउंट सत्यापित हो गया।",
            resendFailedTitle: "फिर से भेजना विफल",
            otpResentTitle: "OTP फिर से भेजा गया",
            otpResentDesc: "नया OTP ईमेल पर भेज दिया गया।",
          },
        },

        layout: {
          tagline: "लोकल दुकानें जल्दी खोजें",
          title: "लोकल शॉपिंग, अब प्रीमियम ऐप जैसा अनुभव।",
          desc: "बुकिंग्स, लाइव लोकेशन, पास की दुकानें और सक्रिय प्लान मैनेज करने के लिए साइन इन करें।",
          features: {
            discovery: {
              label: "स्मार्ट खोज",
              value: "पहले पास की",
            },
            access: {
              label: "तेज़ एक्सेस",
              value: "1-टैप बुकिंग",
            },
            note: "स्पीड, भरोसे और लोकल ग्रोथ के लिए बनाया गया।",
          },
        },
      },

      mobileDrawer: {
        title: "मेरा अकाउंट",
        guest: {
          title: "गेस्ट",
          desc: "बुकिंग्स और लोकेशन मैनेज करने के लिए लॉगिन करें",
        },
        fallbackUser: "यूज़र",
      },

      account: {
        common: {
          yes: "हाँ",
          no: "नहीं",
          connecting: "कनेक्ट हो रहा है…",
        },
        roles: {
          customer: "ग्राहक",
          businessOwner: "दुकानदार",
          admin: "एडमिन",
          staff: "स्टाफ",
        },
        nav: {
          overview: "प्रोफ़ाइल ओवरव्यू",
          location: "लाइव लोकेशन",
          bookings: "मेरी बुकिंग्स",
          referrals: "रेफरल",
          wallet: "वॉलेट और विड्रॉ",
          feedback: "प्लेटफ़ॉर्म फ़ीडबैक",
          settings: "सेटिंग्स",
        },
        profile: {
          labels: {
            userId: "यूज़र आईडी",
            emailVerified: "ईमेल सत्यापित",
          },
        },
        toasts: {
          successTitle: "सफल",
          failedTitle: "विफल",
          authFailedTitle: "प्रमाणीकरण विफल",
          welcomeTitle: "स्वागत है",
          welcomeDesc: "ग्राहक सेशन सक्रिय है।",
          passwordChangedTitle: "पासवर्ड बदला गया",
          passwordChangedDesc: "आपका पासवर्ड अपडेट हो गया।",
        },
        auth: {
          customerOnlyNotice:
            "यह पैनल केवल ग्राहक अकाउंट के लिए है। व्यवसाय मालिक अकाउंट यहाँ लॉगिन नहीं कर सकते।",
          panelDescRegister: "साइन अप करके अपनी प्रोफ़ाइल, बुकिंग और पास की दुकानें मैनेज करें।",
          panelDescLogin: "लॉगिन करके अपनी प्रोफ़ाइल, बुकिंग और पास की दुकानें मैनेज करें।",
          fields: {
            mobileNumber: "मोबाइल नंबर",
          },
          errors: {
            customerOnly: "यहाँ केवल ग्राहक अकाउंट लॉगिन कर सकते हैं",
            emailRequired: "ईमेल आवश्यक है",
            phoneDigits10: "मोबाइल नंबर 10 अंकों का होना चाहिए",
          },
          social: {
            signedInWith: "{{provider}} से साइन इन हो गया।",
            failedGoogleTitle: "Google लॉगिन विफल",
            failedFacebookTitle: "Facebook लॉगिन विफल",
          },
          forgot: {
            inline: {
              otpSent: "OTP भेज दिया गया। इनबॉक्स देखें।",
              otpResent: "OTP फिर से भेज दिया गया।",
              verifyMissing: "ईमेल, OTP और 6+ अक्षरों वाला नया पासवर्ड आवश्यक है",
              resetSuccessLogin: "पासवर्ड रीसेट सफल। अब लॉगिन करें।",
            },
            toast: {
              otpSentTitle: "OTP भेजा गया",
              otpSentDesc: "पासवर्ड रीसेट OTP भेज दिया गया।",
              sendFailedTitle: "रीसेट OTP नहीं भेजा जा सका",
              otpResentTitle: "OTP फिर से भेजा गया",
              otpResentDesc: "इनबॉक्स देखें।",
              resendFailedTitle: "OTP फिर से नहीं भेजा जा सका",
              resetTitle: "पासवर्ड रीसेट",
              resetSignedInDesc: "सफलतापूर्वक साइन इन हो गया।",
              resetNowLoginDesc: "अब नए पासवर्ड से लॉगिन करें।",
              resetFailedTitle: "रीसेट विफल",
            },
          },
        },
        overview: {
          justNow: "अभी",
          phoneNotAdded: "फोन नहीं जोड़ा गया",
          active: "सक्रिय",
          inactive: "निष्क्रिय",
          verified: "सत्यापित",
          unverified: "असत्यापित",
          totalBookings: "कुल बुकिंग्स",
          lastLogin: "पिछला लॉगिन",
          locationStatus: "लोकेशन स्थिति",
          joinedOn: "{{date}} को जॉइन किया",
        },
        bookings: {
          title: "बुकिंग्स",
          desc: "आपकी हाल की बुकिंग्स और अपॉइंटमेंट्स।",
          emptyTitle: "अभी कोई बुकिंग नहीं है",
          emptyDesc: "जब आप कोई सेवा बुक करेंगे, वह यहाँ दिखेगी।",
          fallbackShop: "दुकान",
          fallbackServiceBooking: "सेवा बुकिंग",
          dateNA: "उपलब्ध नहीं",
        },

        orders: {
          title: "ऑर्डर",
          desc: "दुकान पेज से किए गए आपके हाल के ऑर्डर।",
          emptyTitle: "अभी कोई ऑर्डर नहीं है",
          emptyDesc: "जब आप कोई ऑर्डर करेंगे, वह यहाँ दिखेगा।",
          fallbackShop: "दुकान",
          orderLabel: "ऑर्डर",
          orderIdLabel: "ऑर्डर आईडी",
          totalLabel: "कुल",
        },

        wallet: {
          title: "वॉलेट",
          desc: "बैलेंस देखें और विड्रॉ रिक्वेस्ट करें।",
          currentBalance: "वर्तमान बैलेंस",
          requestTitle: "विड्रॉ रिक्वेस्ट करें",
          reasonLabel: "कारण:",
          sections: {
            withdrawalRequestsTitle: "विड्रॉ रिक्वेस्ट्स",
            noWithdrawalsYet: "अभी कोई विड्रॉ नहीं है।",
            recentTransactionsTitle: "हालिया ट्रांजैक्शन्स",
            noTransactionsYet: "अभी कोई ट्रांजैक्शन नहीं है।",
          },
          errors: {
            invalidAmount: "कृपया मान्य राशि दर्ज करें",
            requestFailed: "विड्रॉ रिक्वेस्ट नहीं हो सकी",
          },
          messages: {
            submitted: "विड्रॉ रिक्वेस्ट सबमिट हो गई",
          },
          actions: {
            request: "विड्रॉ रिक्वेस्ट",
            pleaseWait: "कृपया प्रतीक्षा करें…",
          },
          form: {
            amount: "राशि",
            accountHolderName: "खाते का नाम",
            bankName: "बैंक का नाम",
            accountNumber: "खाता नंबर",
            ifsc: "IFSC कोड",
          },
          placeholders: {
            amount: "जैसे 500",
            accountHolderName: "जैसे Priya Sharma",
            bankName: "जैसे SBI",
            accountNumber: "जैसे 1234567890",
            ifsc: "जैसे SBIN0000001",
          },
        },
        location: {
          title: "लाइव लोकेशन",
          desc: "पास की दुकानों/सेवाओं के लिए अपनी लोकेशन अपडेट रखें।",
          searchLabel: "खोजें",
          searchPlaceholder: "लोकेशन खोजें (इलाका, शहर, लैंडमार्क)…",
          search: "खोजें",
          searching: "खोजा जा रहा है…",
          tracking: "ट्रैकिंग",
          detecting: "पता लगाया जा रहा है…",
          live: "लाइव",
          permissionDenied: "अनुमति नहीं मिली",
          idle: "निष्क्रिय",
          area: "इलाका",
          city: "शहर",
          state: "राज्य",
          refresh: "लोकेशन रीफ़्रेश करें",
          useDevice: "डिवाइस की लोकेशन उपयोग करें",
          save: "सेव करें",
          saving: "सेव हो रहा है…",
          lastSynced: "अंतिम सिंक: {{time}}",
          notSyncedYet: "अभी सिंक नहीं हुआ",
          synced: "सिंक हो गया",
          notSynced: "सिंक नहीं हुआ",
          mapMarkerTitle: "आपकी लोकेशन",
          errors: {
            invalidLatitude: "Latitude मान्य होना चाहिए (-90 से 90)",
            invalidLatitudeTitle: "अमान्य latitude",
            invalidLatitudeDesc: "-90 से 90 के बीच मान्य मान का उपयोग करें",
            invalidLongitude: "Longitude मान्य होना चाहिए (-180 से 180)",
            invalidLongitudeTitle: "अमान्य longitude",
            invalidLongitudeDesc: "-180 से 180 के बीच मान्य मान का उपयोग करें",
          },
          inline: {
            saved: "लोकेशन आपकी प्रोफ़ाइल में सेव हो गई।",
          },
          toast: {
            updatedTitle: "लोकेशन अपडेट हुई",
            updatedDesc: "आपकी प्रोफ़ाइल लोकेशन सिंक हो गई।",
            saveFailedTitle: "लोकेशन सेव नहीं हुई",
            refreshingTitle: "रीफ़्रेश हो रहा है",
            refreshingDesc: "डिवाइस से नई लोकेशन ली जा रही है…",
            unavailableTitle: "लोकेशन उपलब्ध नहीं",
            unavailableDesc: "पहले लोकेशन अनुमति दें।",
            deviceAppliedTitle: "डिवाइस लोकेशन लागू हुई",
            deviceAppliedDesc: "कोऑर्डिनेट्स डिवाइस से भर दिए गए।",
            noResultsTitle: "कोई परिणाम नहीं",
            noResultsDesc: "इस खोज के लिए कोई लोकेशन नहीं मिली।",
            searchFailedTitle: "खोज विफल",
            searchFailedDesc: "लोकेशन खोज विफल",
            selectedTitle: "लोकेशन चुनी गई",
            selectedDesc: "लोकेशन लागू हुई",
          },
        },
        settings: {
          title: "सेटिंग्स",
          desc: "अपने अकाउंट की जानकारी और सुरक्षा मैनेज करें।",
          fields: {
            name: "नाम",
            email: "ईमेल",
            phone: "फोन",
            phoneNotAdded: "फोन नहीं जोड़ा गया",
          },
          profilePhoto: {
            label: "प्रोफ़ाइल फोटो",
            uploadChange: "अपलोड / बदलें",
          },
          note: "कुछ फ़ील्ड्स अकाउंट प्रोवाइडर मैनेज करता है, इसलिए उन्हें यहाँ एडिट नहीं किया जा सकता।",
          help: {
            title: "मदद चाहिए?",
            desc: "किसी भी समस्या के लिए सपोर्ट से संपर्क करें।",
            contactSupport: "सपोर्ट से संपर्क करें",
          },
          logout: {
            title: "लॉग आउट",
            desc: "इस डिवाइस से अपने अकाउंट से साइन आउट करें।",
            action: "लॉग आउट",
          },
          changePassword: {
            title: "पासवर्ड बदलें",
            fields: {
              current: "वर्तमान पासवर्ड",
              new: "नया पासवर्ड",
              confirm: "नए पासवर्ड की पुष्टि",
            },
            placeholders: {
              current: "वर्तमान पासवर्ड दर्ज करें",
              new: "कम से कम 6 अक्षर",
              confirm: "नया पासवर्ड फिर से दर्ज करें",
            },
            actions: {
              change: "पासवर्ड बदलें",
              updating: "अपडेट हो रहा है…",
            },
            errors: {
              loginFirst: "कृपया पहले लॉगिन करें",
              allRequired: "पुराना पासवर्ड, नया पासवर्ड और पुष्टि आवश्यक हैं",
              min6: "नया पासवर्ड कम से कम 6 अक्षरों का हो",
              mismatch: "नया पासवर्ड और पुष्टि मेल नहीं खाते",
              failed: "पासवर्ड बदला नहीं जा सका",
            },
            successMessage: "पासवर्ड अपडेट हो गया।",
          },
        },
        profilePhoto: {
          sectionTitle: "प्रोफ़ाइल फोटो",
          sectionDesc: "अपनी प्रोफ़ाइल को पर्सनलाइज़ करने के लिए फोटो अपलोड करें।",
          actions: {
            uploadPhoto: "फोटो अपलोड करें",
            changePhoto: "फोटो बदलें",
            remove: "हटाएं",
          },
          errors: {
            invalidFileTitle: "अमान्य फ़ाइल",
            invalidFileDesc: "कृपया कोई इमेज फ़ाइल चुनें।",
            tooLargeTitle: "फ़ाइल बहुत बड़ी है",
            tooLargeDesc: "2MB से छोटी इमेज अपलोड करें।",
          },
          toast: {
            updatedTitle: "प्रोफ़ाइल फोटो अपडेट हुई",
            updatedDesc: "आपका नया अवतार अपडेट हो गया।",
            uploadFailedTitle: "अपलोड विफल",
            uploadFailedDesc: "फोटो अपलोड नहीं हो सकी।",
            removedTitle: "फोटो हटाई गई",
            removedDesc: "इनिशियल्स अवतार वापस आ गया।",
            removeFailedTitle: "हटाना विफल",
            removeFailedDesc: "फोटो हटाई नहीं जा सकी।",
          },
        },
        feedback: {
          title: "प्लेटफ़ॉर्म फ़ीडबैक",
          desc: "PublicDukan को बेहतर बनाने में मदद करें — अपना अनुभव साझा करें।",
          form: {
            rating: "रेटिंग",
            option5: "5 - बहुत बढ़िया",
            option4: "4 - अच्छा",
            option3: "3 - ठीक-ठाक",
            option2: "2 - खराब",
            option1: "1 - बहुत खराब",
            textLabel: "फ़ीडबैक (वैकल्पिक)",
            textPlaceholder: "क्या सुधार करना चाहिए?",
            maxChars: "अधिकतम {{count}} अक्षर।",
          },
          actions: {
            submit: "फ़ीडबैक सबमिट करें",
            submitting: "सबमिट हो रहा है…",
          },
          errors: {
            loginFirst: "कृपया पहले लॉगिन करें।",
            ratingRequired: "कृपया रेटिंग चुनें (1 से 5)।",
          },
          inline: {
            submitted: "धन्यवाद! फ़ीडबैक सबमिट हो गया।",
            submitFailed: "फ़ीडबैक सबमिट नहीं हो सका",
          },
          toast: {
            submittedTitle: "फ़ीडबैक सबमिट हुआ",
            submittedDesc: "धन्यवाद! आपका फ़ीडबैक एडमिन पैनल में दिखेगा।",
          },
        },
        referrals: {
          title: "रेफरल",
          desc: "अपना कोड साझा करें और व्यवसाय रजिस्ट्रेशन से कमाएं।",
          yourCode: "आपका रेफरल कोड",
          copy: "कॉपी",
          tip: "टिप: दुकानदार से कहें कि साइन अप के समय यह कोड लगाए।",
          learnMore: "रेफरल प्रोग्राम के बारे में और जानें",
          activeOffer: "सक्रिय ऑफ़र: {{offerName}} • {{percent}}% कमीशन",
          stats: {
            totalReferrals: "कुल रेफरल",
            totalEarnings: "कुल कमाई",
            walletBalance: "वॉलेट बैलेंस",
          },
          recentTitle: "हाल के रेफरल",
          emptyRecent: "अभी कोई रेफरल रिकॉर्ड नहीं है।",
          fallbackReferredUser: "दुकानदार",
          earned: "कमाई: ₹{{amount}}",
          errors: {
            summaryLoad: "रेफरल सारांश लोड नहीं हो सका।",
          },
          toast: {
            copiedTitle: "कॉपी हो गया",
            copiedDesc: "रेफरल कोड कॉपी हो गया",
            copyFailedTitle: "कॉपी विफल",
            copyFailedDesc: "कृपया मैन्युअली कॉपी करें",
          },
        },
      },
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
