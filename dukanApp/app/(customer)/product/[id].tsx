import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  LayoutChangeEvent,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { apiRequest } from "@/utils/apiClient";
import { useAuth } from "@/context/AuthContext";

type ProductVariant = {
  size?: string;
  quantity?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  sku?: string;
  inStock?: boolean;
};

type PricingOption = {
  label?: string;
  name?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
};

type Product = {
  _id: string;
  id: string;
  title: string;
  name?: string;
  description?: string;
  price: number;
  oldPrice?: number;
  originalPrice?: number;
  discount?: number;
  images: Array<{ url: string; alt?: string }> | string[];
  image?: string;
  businessId?: string;
  businessName?: string;
  businessLogo?: string;
  listingType?: string;
  type?: string;
  duration?: string;
  isActive?: boolean;
  variants?: ProductVariant[];
  pricingOptions?: PricingOption[];
  category?: string;
  attributes?: Array<{ name: string; value: string }>;
  soldBy?: string;
};

type SelectableOption = {
  name: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
};

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { id, businessId } = useLocalSearchParams<{ id: string; businessId: string }>();
  const { user, accessToken } = useAuth();
  
  const [imageIndex, setImageIndex] = useState<number>(0);
  const [selectedOptionName, setSelectedOptionName] = useState<string>("");
  const [footerHeight, setFooterHeight] = useState(140);

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
    return product.image ? [product.image] : [];
  }, [product]);

  // Current variant data
  const parseMaybePrice = (value: string | number | undefined) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const listingType = String(product?.listingType || product?.type || "product").toLowerCase();
  const typeLabel =
    listingType === "service"
      ? "Service"
      : listingType === "food"
        ? "Food"
        : listingType === "course"
          ? "Course"
          : listingType === "rental"
            ? "Rental"
            : "Product";

  const selectableOptions = useMemo<SelectableOption[]>(() => {
    if (!product) return [];
    const direct = Array.isArray(product.pricingOptions) ? product.pricingOptions : [];
    const directOptions = direct
      .map((o: PricingOption) => ({
        name: String(o?.label || o?.name || "").trim(),
        price: Number(o?.price),
        oldPrice: Number.isFinite(Number(o?.oldPrice)) ? Number(o?.oldPrice) : undefined,
        discountPercent: Number.isFinite(Number(o?.discountPercent)) ? Number(o?.discountPercent) : undefined,
      }))
      .filter((o) => o.name && Number.isFinite(o.price) && o.price >= 0);
    if (directOptions.length > 0) return directOptions;

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.map((variant, idx) => ({
        name: String(variant.size || variant.quantity || `Option ${idx + 1}`),
        price: Number(variant.price),
        oldPrice: Number.isFinite(Number(variant.originalPrice)) ? Number(variant.originalPrice) : undefined,
        discountPercent: Number.isFinite(Number(variant.discount)) ? Number(variant.discount) : undefined,
      }));
    }

    if (listingType !== "food") return [];
    const attrs = Array.isArray(product.attributes) ? product.attributes : [];
    return attrs
      .map((a) => ({ name: String(a?.name || "").trim(), price: parseMaybePrice(a?.value) }))
      .filter((o) => o.name && o.price !== null)
      .map((o) => ({ name: o.name, price: o.price as number }));
  }, [product, listingType]);

  useEffect(() => {
    if (selectableOptions.length === 0) {
      setSelectedOptionName("");
      return;
    }
    setSelectedOptionName((prev) => prev || selectableOptions[0].name);
  }, [selectableOptions]);

  const selectedOption = useMemo(() => {
    if (!selectedOptionName) return null;
    return selectableOptions.find((o) => o.name === selectedOptionName) || null;
  }, [selectableOptions, selectedOptionName]);

  const effectivePrice = selectedOption?.price ?? product?.price ?? 0;
  const effectiveOldPrice =
    selectedOption?.oldPrice ?? product?.originalPrice ?? product?.oldPrice ?? undefined;

  // Calculate discount
  const discountPercent = useMemo(() => {
    const direct = Number(selectedOption?.discountPercent ?? product?.discount);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    const oldPrice = Number(effectiveOldPrice);
    if (!Number.isFinite(oldPrice) || oldPrice <= 0) return 0;
    if (oldPrice <= effectivePrice) return 0;
    return Math.round(((oldPrice - effectivePrice) / oldPrice) * 100);
  }, [selectedOption, product, effectiveOldPrice, effectivePrice]);

  const detailsAttributes = useMemo(() => {
    const attrs = Array.isArray(product?.attributes) ? product.attributes : [];
    const hasDirectOptions = Array.isArray(product?.pricingOptions) && product?.pricingOptions?.length > 0;
    if (hasDirectOptions) return attrs;
    const optionNames = new Set(selectableOptions.map((o) => o.name));
    return attrs.filter((a) => !optionNames.has(String(a?.name || "").trim()));
  }, [product, selectableOptions]);

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
  const businessSlug = business?.slug ? String(business.slug) : "";
  const canOrder = selectableOptions.length === 0 || !!selectedOption;

  const handleWhatsAppOrder = async () => {
    if (!user) {
      Alert.alert("Login required", "Please login to place an order.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }

    if (!canOrder) {
      Alert.alert("Select an option", "Please choose an option to continue.");
      return;
    }

    const orderBusinessId = String(businessId || product?.businessId || "").trim();
    if (!orderBusinessId) {
      Alert.alert("Order failed", "Business info is missing.");
      return;
    }

    const wa = business?.whatsapp || "";
    const digits = wa.replace(/\D/g, "");
    if (!digits) {
      Alert.alert("WhatsApp unavailable", "This shop has no WhatsApp number.");
      return;
    }

    try {
      await apiRequest("/orders/public", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          businessId: orderBusinessId,
          source: "whatsapp",
          origin: "unknown",
          items: [
            {
              listingId: String(id || ""),
              quantity: 1,
              ...(selectedOption ? { pricingOptionLabel: selectedOption.name } : {}),
            },
          ],
          customer: {
            name: String(user?.name || "").trim() || undefined,
            phone: String(user?.phone || "").trim() || undefined,
          },
        }),
      });
    } catch (err: any) {
      Alert.alert("Order failed", err?.message || "Please try again.");
      return;
    }

    const lines = [
      `Order: ${productTitle}`,
      `Price: ₹${Number(effectivePrice).toLocaleString("en-IN")}`,
      selectedOption ? `Option: ${selectedOption.name}` : null,
      `Shop: ${sellerName}`,
    ].filter(Boolean);

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
    Linking.openURL(url);
  };

  const footerBottom = Math.max(insets.bottom, 10);
  const footerOffsetFromBottom = tabBarHeight;

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
        contentContainerStyle={{ paddingBottom: footerHeight + footerOffsetFromBottom + footerBottom + 24 }}
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
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="image" size={40} color={Colors.light.textSecondary} />
            </View>
          )}
        </Animated.View>

        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageThumbs}
          >
            {images.map((src, idx) => (
              <Pressable
                key={`${src}-${idx}`}
                style={[styles.thumbButton, idx === imageIndex && styles.thumbButtonActive]}
                onPress={() => setImageIndex(idx)}
              >
                <Image source={{ uri: src }} style={styles.thumbImage} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Product Info */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.contentSection}>
          {/* Title */}
          <Text style={styles.productTitle}>{productTitle}</Text>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{Number(effectivePrice).toLocaleString("en-IN")}</Text>
              {effectiveOldPrice && (
                <Text style={styles.originalPrice}>₹{Number(effectiveOldPrice).toLocaleString("en-IN")}</Text>
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
              <Text style={styles.badgeText}>{typeLabel}</Text>
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
          {selectableOptions.length > 0 && (
            <View style={styles.optionsSection}>
              <Text style={styles.sectionTitle}>Choose option</Text>
              {selectableOptions.map((option, idx) => {
                const active = option.name === selectedOptionName;
                const optOld = Number(option.oldPrice);
                const showOld = Number.isFinite(optOld) && optOld > 0 && optOld > Number(option.price);
                const optPercent = (() => {
                  const direct = Number(option.discountPercent);
                  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
                  if (!showOld) return 0;
                  return Math.round(((optOld - Number(option.price)) / optOld) * 100);
                })();
                return (
                  <Pressable
                    key={`${option.name}-${idx}`}
                    style={[styles.optionCard, active && styles.optionCardSelected]}
                    onPress={() => setSelectedOptionName(option.name)}
                  >
                    <Text style={styles.optionLabel}>{option.name}</Text>
                    <View style={styles.optionPriceRow}>
                      <Text style={styles.optionPrice}>₹{Number(option.price).toLocaleString("en-IN")}</Text>
                      {showOld && (
                        <Text style={styles.optionOriginalPrice}>₹{optOld.toLocaleString("en-IN")}</Text>
                      )}
                      {optPercent > 0 && (
                        <View style={styles.optionDiscountBadge}>
                          <Text style={styles.optionDiscountText}>-{optPercent}%</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Attributes */}
          {(detailsAttributes.length > 0 || product?.duration || product?.listingType) && (
            <View style={styles.attributesSection}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.attributeGrid}>
                {detailsAttributes.map((attr, idx) => (
                  <View key={idx} style={styles.attributeItem}>
                    <Text style={styles.attributeName}>{attr.name}</Text>
                    <Text style={styles.attributeValue}>{attr.value}</Text>
                  </View>
                ))}
                {product?.duration && (
                  <View style={styles.attributeItem}>
                    <Text style={styles.attributeName}>Duration</Text>
                    <Text style={styles.attributeValue}>{product.duration}</Text>
                  </View>
                )}
                {product?.listingType && (
                  <View style={styles.attributeItem}>
                    <Text style={styles.attributeName}>Type</Text>
                    <Text style={styles.attributeValue}>{typeLabel}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Spacing */}
          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: footerBottom + 12,
            bottom: footerOffsetFromBottom,
          },
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          const h = e?.nativeEvent?.layout?.height;
          if (typeof h === "number" && Number.isFinite(h) && h > 0) setFooterHeight(h);
        }}
      >
        <Pressable
          style={[styles.addButton, !canOrder && styles.addButtonDisabled]}
          onPress={handleWhatsAppOrder}
          disabled={!canOrder}
        >
          <Text style={styles.addButtonText}>Order on WhatsApp</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push({ pathname: "/(customer)/booking", params: { businessId, businessSlug, businessName: sellerName } })}
        >
          <Text style={styles.secondaryButtonText}>Book Appointment</Text>
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
  imageThumbs: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  thumbButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  thumbButtonActive: {
    borderColor: Colors.light.primary,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
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
    gap: 10,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    position: "absolute",
    left: 0,
    right: 0,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: Colors.light.primary,
    fontSize: 15,
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
