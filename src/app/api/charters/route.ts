import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = "/tmp/always80-data";
const BOOKINGS_FILE = path.join(DATA_DIR, "charter-bookings.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, "[]");
}

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

function getBookings(): Booking[] {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf-8"));
}

function saveBookings(bookings: Booking[]) {
  ensureDataDir();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

export async function GET() {
  const bookings = getBookings();
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

    const bookings = getBookings();
    bookings.push(booking);
    saveBookings(bookings);

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

    const bookings = getBookings();
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (status) bookings[idx].status = status;
    if (notes !== undefined) bookings[idx].notes = notes;

    saveBookings(bookings);
    return NextResponse.json({ booking: bookings[idx] });
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
