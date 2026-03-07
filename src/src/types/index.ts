export interface Product {
  id?: string;
  name: string;
  price: number;
  priceSol?: number;
  type: "free" | "one-time" | "monthly";
  description?: string;
}

export interface Tier {
  name: string;
  price: number;
  priceSol: number;
  perks: string[];
}

export interface Post {
  id: string;
  creatorId: number;
  title: string;
  body: string;
  tier: "free" | "Explorer" | "Scholar" | "VIP Learner";
  videoUrl?: string;
  imageUrl?: string;
  createdAt: string; // ISO string
  likes: number;
}

export interface Creator {
  id: number;
  name: string;
  avatar: string;
  bio: string;
  subscribers: number;
  products: Product[];
  tiers: Tier[];
  posts: Post[];
}

export type TierName = "free" | "Explorer" | "Scholar" | "VIP Learner";

export const TIER_ORDER: TierName[] = ["free", "Explorer", "Scholar", "VIP Learner"];
