import { Link } from "react-router-dom";
import { Star, MessageCircle, Phone, MapPin, BadgeCheck, Navigation2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shop } from "@/data/mockData";
import { useUserLocation, getDistanceKm, formatDistance } from "@/hooks/useUserLocation";

export default function ShopCard({ shop }: { shop: Shop }) {
  const { userLocation } = useUserLocation();

  const distance = (() => {
    const backendDistance = Number((shop as any)?.distanceKm);
    if (Number.isFinite(backendDistance) && backendDistance >= 0) return backendDistance;
    return userLocation
      ? getDistanceKm(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude)
      : null;
  })();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <Link to={`/${shop.slug}`}>
        <div className="relative h-44 overflow-hidden">
          <img
            src={shop.coverImage}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {shop.verified && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground gap-1">
              <BadgeCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
          <Badge
            variant={shop.isOpen ? "default" : "secondary"}
            className={`absolute top-2 right-2 ${shop.isOpen ? "bg-primary" : ""}`}
          >
            {shop.isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </Link>
      <CardContent className="p-4">
        <Link to={`/${shop.slug}`}>
          <h3 className="font-semibold text-base truncate hover:text-primary transition-colors">
            {shop.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{shop.category}</span>
          <span>•</span>
          <MapPin className="h-3 w-3" />
          <span>{shop.area}, {shop.city}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-secondary text-secondary" />
            <span className="font-medium text-sm">{shop.rating}</span>
            <span className="text-xs text-muted-foreground">({shop.reviewCount} reviews)</span>
          </div>
          {distance !== null && (
            <div className="flex items-center gap-1 text-xs font-medium text-accent">
              <Navigation2 className="h-3 w-3" />
              <span>{formatDistance(distance)} door</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 gap-1" asChild>
            <a href={`https://wa.me/${shop.whatsapp}?text=Hi, I found your shop on DukaanDirect!`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </Button>
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <a href={`tel:+${shop.phone}`}>
              <Phone className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
