"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TierName, TIER_ORDER } from "@/types";

const COLORS = {
  darkBg: "#0F0A1E",
  purple: "#9945FF",
  teal: "#14F195",
  cardBg: "#1A1333",
  lightText: "#B8B8D0",
  midGray: "#6B6B8D",
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = searchParams.get("tier") as TierName | null;
  const email = searchParams.get("email");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tier && email && TIER_ORDER.includes(tier as TierName)) {
      // Save subscription to localStorage keyed by email
      try {
        const data = {
          email,
          tier,
          subscribedAt: new Date().toISOString(),
          paymentMethod: "stripe",
        };
        localStorage.setItem(`solgate_sub_email_${email}`, JSON.stringify(data));
        // Also save the email so main app can check it
        localStorage.setItem("solgate_stripe_email", email);
        setSaved(true);
      } catch {
        // localStorage unavailable
      }
    }
  }, [tier, email]);

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => router.push("/"), 4000);
      return () => clearTimeout(timer);
    }
  }, [saved, router]);

  if (!tier) {
    return (
      <div className="rounded-xl p-8 max-w-md w-full border text-center" style={{ backgroundColor: COLORS.cardBg, borderColor: "#2D2550" }}>
        <h1 className="text-xl font-bold text-red-400 mb-2">Missing Information</h1>
        <p className="text-sm mb-4" style={{ color: COLORS.lightText }}>
          Something went wrong with the payment redirect.
        </p>
        <button onClick={() => router.push("/")} className="px-6 py-2 rounded-lg font-medium text-white cursor-pointer" style={{ backgroundColor: COLORS.purple }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-8 max-w-md w-full border text-center" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.teal }}>
      <div className="text-5xl mb-4" style={{ color: COLORS.teal }}>&#10003;</div>
      <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
      <p className="text-sm mb-2" style={{ color: COLORS.lightText }}>
        You&apos;re now subscribed to <strong style={{ color: COLORS.teal }}>{tier}</strong>
      </p>
      <p className="text-xs mb-6" style={{ color: COLORS.midGray }}>
        Your exclusive content is now unlocked. Redirecting...
      </p>
      <button onClick={() => router.push("/")} className="px-6 py-2 rounded-lg font-medium text-white cursor-pointer w-full" style={{ backgroundColor: COLORS.purple }}>
        Go to Feed
      </button>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: COLORS.darkBg }}>
      <Suspense fallback={
        <div className="text-center">
          <p className="text-white">Loading...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
