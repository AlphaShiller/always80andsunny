import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_KEY = "charter-bookings.json";

interface Booking {
  id: string;
  tripType: string;
  date: string;
  time: string;
  groupSize: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

async function getBookings(): Promise<Booking[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

async function saveBookings(bookings: Booking[]) {
  await put(BLOB_KEY, JSON.stringify(bookings, null, 2), {

    access: "private" as any,
    addRandomSuffix: false,
  });
}

export async function GET() {
  const bookings = await getBookings();
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripType, date, time, groupSize, name, email, phone, notes, total, paymentMethod } = body;

    if (!tripType || !date || !name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const booking: Booking = {
      id: `CHR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      tripType,
      date,
      time: time || "6:00 AM",
      groupSize: groupSize || 1,
      name,
      email,
      phone,
      notes: notes || "",
      total: total || 0,
      paymentMethod: paymentMethod || "card",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    const bookings = await getBookings();
    bookings.push(booking);
    await saveBookings(bookings);

    return NextResponse.json({ booking });
  } catch {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, status, notes } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const bookings = await getBookings();
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (status) bookings[idx].status = status;
    if (notes !== undefined) bookings[idx].notes = notes;

    await saveBookings(bookings);
    return NextResponse.json({ booking: bookings[idx] });
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
