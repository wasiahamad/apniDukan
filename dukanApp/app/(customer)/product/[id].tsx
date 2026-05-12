import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { apiRequest } from "@/utils/apiClient";

type ProductVariant = {
  size?: string;
  quantity?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  sku?: string;
  inStock?: boolean;
};

type Product = {
  _id: string;
  id: string;
  title: string;
  name?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: Array<{ url: string; alt?: string }> | string[];
  businessId?: string;
  businessName?: string;
  businessLogo?: string;
  listingType?: string;
  isActive?: boolean;
  variants?: ProductVariant[];
  category?: string;
  attributes?: Array<{ name: string; value: string }>;
  soldBy?: string;
};

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { id, businessId } = useLocalSearchParams<{ id: string; businessId: string }>();
  
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [imageIndex, setImageIndex] = useState<number>(0);

  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest<Product>(`/listings/${id}`);
      return response;
    },
    enabled: !!id,
  });

  // Fetch business info (seller)
  const { data: business } = useQuery({
    queryKey: ["business-seller", businessId || product?.businessId],
    queryFn: async () => {
      const bid = businessId || product?.businessId;
      if (!bid) return null;
      const response = await apiRequest<any>(`/businesses/${bid}`);
      return response;
    },
    enabled: !!(businessId || product?.businessId),
  });

  // Process images
  const images = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images)) {
      return product.images
        .map((img: any) => (typeof img === "string" ? img : img?.url))
        .filter(Boolean);
    }
    return [];
  }, [product]);

  // Current variant data
  const currentVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return {
        price: product?.price || 0,
        originalPrice: product?.originalPrice,
        discount: product?.discount,
      };
    }
    return product.variants[selectedVariant] || product.variants[0];
  }, [product, selectedVariant]);

  // Calculate discount
  const discountPercent = useMemo(() => {
    if (currentVariant.discount) return currentVariant.discount;
    if (currentVariant.originalPrice && currentVariant.price) {
      return Math.round(
        ((currentVariant.originalPrice - currentVariant.price) / currentVariant.originalPrice) * 100
      );
    }
    return 0;
  }, [currentVariant]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.errorText}>Product not found</Text>
        <Pressable 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const sellerName = business?.name || product?.businessName || "Store";
  const productTitle = product?.title || product?.name || "Product";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Close Button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Feather name="x" size={24} color={Colors.light.text} />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Product Image */}
        <Animated.View entering={FadeIn} style={styles.imageSection}>
          {images.length > 0 ? (
            <>
              <Image
                source={{ uri: images[imageIndex] }}
                style={styles.productImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {images.length > 1 && (
                <View style={styles.imageDots}>
                  {images.map((_, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.dot,
                        idx === imageIndex && styles.activeDot,
                      ]}
                      onPress={() => setImageIndex(idx)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="image" size={40} color={Colors.light.textSecondary} />
            </View>
          )}
        </Animated.View>

        {/* Product Info */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.contentSection}>
          {/* Title */}
          <Text style={styles.productTitle}>{productTitle}</Text>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{currentVariant.price.toLocaleString("en-IN")}</Text>
              {currentVariant.originalPrice && (
                <Text style={styles.originalPrice}>₹{currentVariant.originalPrice.toLocaleString("en-IN")}</Text>
              )}
              {discountPercent > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{discountPercent}%</Text>
                </View>
              )}
            </View>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerSection}>
            <Text style={styles.sellerLabel}>Sold by</Text>
            <Text style={styles.sellerName}>{sellerName}</Text>
          </View>

          {/* Product Type Badge */}
          <View style={styles.badgeSection}>
            <View style={styles.productBadge}>
              <Text style={styles.badgeText}>Product</Text>
            </View>
          </View>

          {/* Description */}
          {product?.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Choose Option / Variants */}
          {product?.variants && product.variants.length > 0 && (
            <View style={styles.optionsSection}>
              <Text style={styles.sectionTitle}>Choose option</Text>
              {product.variants.map((variant, idx) => {
                const variantLabel = variant.size || variant.quantity || `Option ${idx + 1}`;
                const varDiscount = variant.discount || (variant.originalPrice && variant.price
                  ? Math.round(((variant.originalPrice - variant.price) / variant.originalPrice) * 100)
                  : 0);

                return (
                  <Pressable
                    key={idx}
                    style={[
                      styles.optionCard,
                      selectedVariant === idx && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedVariant(idx)}
                  >
                    <Text style={styles.optionLabel}>{variantLabel}</Text>
                    <View style={styles.optionPriceRow}>
                      <Text style={styles.optionPrice}>₹{variant.price.toLocaleString("en-IN")}</Text>
                      {variant.originalPrice && (
                        <Text style={styles.optionOriginalPrice}>₹{variant.originalPrice.toLocaleString("en-IN")}</Text>
                      )}
                      {varDiscount > 0 && (
                        <View style={styles.optionDiscountBadge}>
                          <Text style={styles.optionDiscountText}>-{varDiscount}%</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControl}>
              <Pressable
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </Pressable>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Attributes */}
          {product?.attributes && product.attributes.length > 0 && (
            <View style={styles.attributesSection}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.attributeGrid}>
                {product.attributes.map((attr, idx) => (
                  <View key={idx} style={styles.attributeItem}>
                    <Text style={styles.attributeName}>{attr.name}</Text>
                    <Text style={styles.attributeValue}>{attr.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Spacing */}
          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, marginBottom: tabBarHeight }]}>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    position: "relative",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
  },
  imageDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 8,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 16,
    fontFamily: "Sora_700Bold",
  },
  priceSection: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
    fontFamily: "Sora_700Bold",
  },
  originalPrice: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textDecorationLine: "line-through",
    fontFamily: "Manrope_400Regular",
  },
  discountBadge: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
  },
  sellerSection: {
    marginBottom: 20,
  },
  sellerLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontFamily: "Manrope_400Regular",
  },
  sellerName: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
    fontFamily: "Manrope_500Medium",
    marginTop: 4,
  },
  badgeSection: {
    marginBottom: 24,
  },
  productBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FF9500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
  },
  descriptionSection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
    fontFamily: "Sora_600SemiBold",
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    fontFamily: "Manrope_400Regular",
  },
  optionsSection: {
    marginBottom: 24,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: Colors.light.textSecondary + "33",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  optionCardSelected: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
    backgroundColor: Colors.light.primary + "10",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
    fontFamily: "Manrope_600SemiBold",
  },
  optionPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    fontFamily: "Manrope_600SemiBold",
  },
  optionOriginalPrice: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textDecorationLine: "line-through",
    fontFamily: "Manrope_400Regular",
  },
  optionDiscountBadge: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  optionDiscountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    minWidth: 30,
    textAlign: "center",
    fontFamily: "Manrope_600SemiBold",
  },
  attributesSection: {
    marginBottom: 24,
  },
  attributeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  attributeItem: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  attributeName: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: "Manrope_600SemiBold",
  },
  attributeValue: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.text,
    fontFamily: "Manrope_500Medium",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
  },
});
