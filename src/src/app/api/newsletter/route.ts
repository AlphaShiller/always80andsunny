import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = "/tmp/solgate-data";
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "newsletter-subscribers.json");

function ensureDataDir() {
  const dir = path.dirname(SUBSCRIBERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SUBSCRIBERS_FILE)) fs.writeFileSync(SUBSCRIBERS_FILE, "[]");
}

interface Subscriber {
  email: string;
  name: string;
  subscribedAt: string;
}

function getSubscribers(): Subscriber[] {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf-8"));
}

function saveSubscribers(subs: Subscriber[]) {
  ensureDataDir();
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2));
}

export async function GET() {
  const subscribers = getSubscribers();
  return NextResponse.json({ count: subscribers.length, subscribers });
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const subscribers = getSubscribers();

    // Check for duplicate
    if (subscribers.some((s: Subscriber) => s.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ message: "You're already subscribed!", alreadySubscribed: true });
    }

    subscribers.push({
      email: email.toLowerCase().trim(),
      name: name || "",
      subscribedAt: new Date().toISOString(),
    });

    saveSubscribers(subscribers);

    return NextResponse.json({ message: "Successfully subscribed!", count: subscribers.length });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
