import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// Tier subscriptions (monthly recurring)
const TIER_PRICES: Record<string, number> = {
  Explorer: 499,
  Scholar: 999,
  "VIP Learner": 1242,
};

// One-time product prices
const PRODUCT_PRICES: Record<string, number> = {
  "Complete History Bundle": 1999,
  "Weekly New Videos": 1242,
};

export async function POST(request: NextRequest) {
  try {
    const { tierName, email } = await request.json();

    if (!tierName || !email) {
      return NextResponse.json({ error: "Missing tierName or email" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://solgate-one.vercel.app";

    // Check if this is a tier subscription or a product purchase
    const tierAmount = TIER_PRICES[tierName];
    const productAmount = PRODUCT_PRICES[tierName];

    if (!tierAmount && !productAmount) {
      return NextResponse.json({ error: "Invalid tier or product" }, { status: 400 });
    }

    if (tierAmount) {
      // Subscription checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `SolGate — ${tierName} Tier`,
                description: `Monthly subscription to ${tierName} tier on SolGate`,
              },
              unit_amount: tierAmount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${appUrl}/success?tier=${encodeURIComponent(tierName)}&email=${encodeURIComponent(email)}`,
        cancel_url: `${appUrl}?canceled=true`,
        metadata: { tier: tierName, email },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // One-time product checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `SolGate — ${tierName}`,
                description: `One-time purchase: ${tierName}`,
              },
              unit_amount: productAmount!,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/success?tier=${encodeURIComponent(tierName)}&email=${encodeURIComponent(email)}`,
        cancel_url: `${appUrl}?canceled=true`,
        metadata: { product: tierName, email },
      });

      return NextResponse.json({ url: session.url });
    }
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
