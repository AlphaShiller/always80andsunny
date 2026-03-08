import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_KEY = "newsletter-subscribers.json";

interface Subscriber {
  email: string;
  name: string;
  subscribedAt: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

async function saveSubscribers(subs: Subscriber[]) {
  await put(BLOB_KEY, JSON.stringify(subs, null, 2), {

    access: "private" as any,
    addRandomSuffix: false,
  });
}

export async function GET() {
  const subscribers = await getSubscribers();
  return NextResponse.json({ count: subscribers.length, subscribers });
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const subscribers = await getSubscribers();

    // Check for duplicate
    if (subscribers.some((s: Subscriber) => s.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ message: "You're already subscribed!", alreadySubscribed: true });
    }

    subscribers.push({
      email: email.toLowerCase().trim(),
      name: name || "",
      subscribedAt: new Date().toISOString(),
    });

    await saveSubscribers(subscribers);

    return NextResponse.json({ message: "Successfully subscribed!", count: subscribers.length });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
