"use client";

import { useState, useCallback, useEffect } from "react";
import { TierName, TIER_ORDER } from "@/types";

interface SubscriptionData {
  identifier: string;
  tier: TierName;
  subscribedAt: string;
  paymentMethod: "solana" | "stripe";
}

function loadSub(key: string): SubscriptionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSub(key: string, data: SubscriptionData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

function getHigherTier(a: TierName | null, b: TierName | null): TierName | null {
  if (!a) return b;
  if (!b) return a;
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

// Load any Stripe email saved during /success redirect
function getStripeEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("always80_stripe_email");
  } catch {
    return null;
  }
}

export function useSubscriptions(walletAddress: string | null) {
  const [subscribedTier, setSubscribedTier] = useState<TierName | null>(null);
  const [stripeEmail, setStripeEmail] = useState<string | null>(null);

  // Load subscription on mount — check both wallet and email keys
  useEffect(() => {
    let best: TierName | null = null;

    // Check wallet-based subscription
    if (walletAddress) {
      const walletSub = loadSub(`always80_sub_${walletAddress}`);
      if (walletSub) best = getHigherTier(best, walletSub.tier);
    }

    // Check email-based subscription (from Stripe)
    const email = getStripeEmail();
    if (email) {
      setStripeEmail(email);
      const emailSub = loadSub(`always80_sub_email_${email}`);
      if (emailSub) best = getHigherTier(best, emailSub.tier);
    }

    setSubscribedTier(best);
  }, [walletAddress]);

  // Subscribe via Solana (wallet-based)
  const subscribe = useCallback(
    (tierName: TierName) => {
      if (!walletAddress) return;
      const current = subscribedTier;
      if (current) {
        const currentIdx = TIER_ORDER.indexOf(current);
        const newIdx = TIER_ORDER.indexOf(tierName);
        if (newIdx <= currentIdx) return;
      }
      const data: SubscriptionData = {
        identifier: walletAddress,
        tier: tierName,
        subscribedAt: new Date().toISOString(),
        paymentMethod: "solana",
      };
      saveSub(`always80_sub_${walletAddress}`, data);
      setSubscribedTier(tierName);
    },
    [walletAddress, subscribedTier]
  );

  // Refresh after Stripe payment (called when returning from /success)
  const refreshStripeSubscription = useCallback(() => {
    const email = getStripeEmail();
    if (!email) return;
    setStripeEmail(email);
    const emailSub = loadSub(`always80_sub_email_${email}`);
    if (emailSub) {
      const best = getHigherTier(subscribedTier, emailSub.tier);
      setSubscribedTier(best);
    }
  }, [subscribedTier]);

  // Check if user can view content at a given tier
  const canViewTier = useCallback(
    (tierName: TierName): boolean => {
      if (tierName === "free") return true;
      if (!subscribedTier) return false;
      const userIdx = TIER_ORDER.indexOf(subscribedTier);
      const requiredIdx = TIER_ORDER.indexOf(tierName);
      return userIdx >= requiredIdx;
    },
    [subscribedTier]
  );

  return { subscribedTier, subscribe, canViewTier, stripeEmail, refreshStripeSubscription };
}
