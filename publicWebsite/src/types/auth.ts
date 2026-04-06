export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  profileImage?: string;
  role: "customer" | "business_owner" | "admin" | "staff";
  createdAt?: string;
  updatedAt?: string;
  currentLocation?: {
    type?: "Point";
    coordinates?: [number, number];
    accuracy?: number;
    capturedAt?: string;
  };
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type SocialProvider = "google" | "facebook";
