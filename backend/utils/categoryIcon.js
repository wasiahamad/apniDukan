const FALLBACK_ICON = '📦';

/**
 * Infer an emoji icon from a category name.
 * Keep this conservative: simple keyword matching + safe fallback.
 */
export const inferCategoryIcon = (name) => {
  const raw = (name || '').toString().trim();
  if (!raw) return FALLBACK_ICON;

  const n = raw.toLowerCase();

  const hasAny = (keywords) => keywords.some((k) => n.includes(k));

  // Kirana / grocery
  if (hasAny(['grocery', 'kirana', 'kiraana', 'general store', 'ration', 'किराना', 'राशन'])) return '🛒';

  // Dairy
  if (hasAny(['dairy', 'milk', 'paneer', 'curd', 'yogurt', 'दूध', 'डेयरी', 'पनीर', 'दही'])) return '🥛';

  // Snacks
  if (hasAny(['snack', 'snacks', 'namkeen', 'chips', 'biscuit', 'biscuits', 'cookies', 'नमकीन', 'चिप्स', 'बिस्किट'])) return '🍪';

  // Beverages
  if (hasAny(['beverage', 'beverages', 'drink', 'drinks', 'tea', 'coffee', 'juice', 'soda', 'cold drink', 'कोल्ड ड्रिंक', 'चाय', 'कॉफी', 'जूस'])) return '☕';

  // Household / home
  if (hasAny(['household', 'home', 'cleaning', 'detergent', 'soap', 'साफ', 'क्लीन', 'डिटर्जेंट'])) return '🏠';

  // Personal care / beauty
  if (hasAny(['personal care', 'beauty', 'cosmetic', 'cosmetics', 'skincare', 'hair', 'shampoo', 'टॉयलेटरी', 'कॉस्मेटिक'])) return '💆';

  // Fruits & vegetables
  if (hasAny(['vegetable', 'vegetables', 'veggie', 'veggies', 'sabzi', 'सब्जी', 'फल', 'fruits', 'fruit'])) return '🥦';

  // Bakery
  if (hasAny(['bakery', 'bread', 'cake', 'pastry', 'cookies', 'बेकरी', 'ब्रेड', 'केक'])) return '🥐';

  // Meat
  if (hasAny(['meat', 'chicken', 'mutton', 'fish', 'seafood', 'मीट', 'चिकन', 'मटन', 'मछली'])) return '🍗';

  // Restaurant / fast food
  if (hasAny(['fast food', 'chinese', 'restaurant', 'street food', 'roll', 'burger', 'pizza', 'चाइनीज', 'फास्ट फूड'])) return '🍽️';

  // Sweets
  if (hasAny(['sweet', 'sweets', 'dessert', 'desserts', 'mithai', 'मिठाई', 'डेज़र्ट'])) return '🍰';

  // Pharmacy
  if (hasAny(['pharmacy', 'medical', 'medicine', 'medicines', 'chemist', 'दवा', 'मेडिकल'])) return '💊';

  // Electronics
  if (hasAny(['electronics', 'electronic', 'mobile', 'phone', 'gadget', 'gadgets'])) return '📱';

  // Clothing
  if (hasAny(['clothing', 'fashion', 'garment', 'garments', 'apparel', 'कपड़े'])) return '👕';

  // Stationery
  if (hasAny(['stationery', 'books', 'book', 'school', 'notebook', 'pen', 'pencil', 'कॉपी', 'किताब'])) return '✏️';

  // Hardware
  if (hasAny(['hardware', 'tools', 'tool', 'paint', 'electrical', 'plumbing'])) return '🛠️';

  return FALLBACK_ICON;
};

export const CATEGORY_FALLBACK_ICON = FALLBACK_ICON;
