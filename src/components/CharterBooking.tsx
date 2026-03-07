"use client";

import { useState } from "react";
import { COLORS } from "@/utils/colors";

interface TripType {
  id: string;
  name: string;
  duration: string;
  price: number;
  priceSol: number;
  maxGuests: number;
  description: string;
  emoji: string;
  departsAt: string;
}

const TRIP_TYPES: TripType[] = [
  {
    id: "inshore-half",
    name: "Inshore Half Day",
    duration: "4 hours",
    price: 350,
    priceSol: 2.55,
    maxGuests: 4,
    description: "Redfish, snook, and trout in the flats and mangroves. Perfect for beginners and families.",
    emoji: "🎣",
    departsAt: "7:00 AM or 1:00 PM",
  },
  {
    id: "inshore-full",
    name: "Inshore Full Day",
    duration: "8 hours",
    price: 600,
    priceSol: 4.35,
    maxGuests: 4,
    description: "Full day exploring the best inshore spots. Lunch included. Target multiple species.",
    emoji: "🐟",
    departsAt: "6:00 AM",
  },
  {
    id: "offshore-half",
    name: "Offshore Half Day",
    duration: "5 hours",
    price: 600,
    priceSol: 4.35,
    maxGuests: 6,
    description: "Nearshore reefs and wrecks. Mahi, snapper, grouper, and more.",
    emoji: "🚤",
    departsAt: "7:00 AM or 12:00 PM",
  },
  {
    id: "offshore-full",
    name: "Offshore Full Day",
    duration: "10 hours",
    price: 1200,
    priceSol: 8.70,
    maxGuests: 6,
    description: "Deep sea adventure — tuna, mahi, wahoo, swordfish. The ultimate fishing experience.",
    emoji: "🦈",
    departsAt: "5:00 AM",
  },
  {
    id: "sunset",
    name: "Sunset Cruise & Fish",
    duration: "3 hours",
    price: 250,
    priceSol: 1.82,
    maxGuests: 6,
    description: "Casual evening trip — light tackle fishing while watching the sunset. BYOB friendly.",
    emoji: "🌅",
    departsAt: "Varies by season",
  },
  {
    id: "custom",
    name: "Custom Charter",
    duration: "Your call",
    price: 150,
    priceSol: 1.09,
    maxGuests: 6,
    description: "Build your own trip — you pick the target species, duration, and style. Price is per hour.",
    emoji: "⭐",
    departsAt: "Flexible",
  },
];

export default function CharterBooking() {
  const [selectedTrip, setSelectedTrip] = useState<TripType | null>(null);
  const [step, setStep] = useState<"browse" | "book" | "confirm">("browse");
  const [form, setForm] = useState({
    date: "",
    time: "",
    groupSize: 2,
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ id: string } | null>(null);
  const [error, setError] = useState("");

  // Get next 30 days for date selection
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const handleBook = async () => {
    if (!selectedTrip || !form.date || !form.name || !form.email || !form.phone) {
      setError("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/charters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripType: selectedTrip.name,
          date: form.date,
          time: form.time || selectedTrip.departsAt.split(" or ")[0],
          groupSize: form.groupSize,
          name: form.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          total: selectedTrip.id === "custom" ? selectedTrip.price * 4 * form.groupSize : selectedTrip.price,
          paymentMethod: "card",
        }),
      });
      const data = await res.json();
      if (data.booking) {
        setBookingResult(data.booking);
        setStep("confirm");
      } else {
        throw new Error(data.error || "Booking failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book");
    }
    setSubmitting(false);
  };

  const inputStyle = {
    backgroundColor: "#0A1628",
    color: COLORS.lightText,
    border: "1px solid #1E3A5F",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0"
          style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.teal})`, color: "white" }}
        >
          80
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Book a Charter</h2>
          <p className="text-xs" style={{ color: COLORS.midGray }}>
            Pick your adventure — all trips depart from our marina
          </p>
        </div>
      </div>

      {step === "browse" && (
        <>
          {/* Trip Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRIP_TYPES.map((trip) => (
              <div
                key={trip.id}
                className="rounded-xl border p-5 cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: selectedTrip?.id === trip.id ? "#162A46" : COLORS.cardBg,
                  borderColor: selectedTrip?.id === trip.id ? COLORS.purple : "#1E3A5F",
                  boxShadow: selectedTrip?.id === trip.id ? `0 0 20px ${COLORS.purple}30` : "none",
                }}
                onClick={() => setSelectedTrip(trip)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{trip.emoji}</span>
                  <div className="text-right">
                    <span className="text-lg font-black" style={{ color: COLORS.teal }}>
                      ${trip.price}
                    </span>
                    <p className="text-xs" style={{ color: COLORS.midGray }}>
                      {trip.priceSol} SOL
                    </p>
                  </div>
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{trip.name}</h3>
                <p className="text-xs mb-3" style={{ color: COLORS.lightText }}>{trip.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1E3A5F", color: COLORS.teal }}>
                    {trip.duration}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1E3A5F", color: COLORS.lightText }}>
                    Up to {trip.maxGuests} guests
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1E3A5F", color: COLORS.lightText }}>
                    Departs {trip.departsAt}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Book Button */}
          {selectedTrip && (
            <div className="rounded-xl p-5 border" style={{ backgroundColor: COLORS.cardBg, borderColor: "#1E3A5F" }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-white font-bold">{selectedTrip.emoji} {selectedTrip.name} Selected</p>
                  <p className="text-sm" style={{ color: COLORS.midGray }}>
                    {selectedTrip.duration} — up to {selectedTrip.maxGuests} guests — ${selectedTrip.price}
                    {selectedTrip.id === "custom" ? "/hr" : " total"}
                  </p>
                </div>
                <button
                  onClick={() => setStep("book")}
                  className="px-6 py-3 rounded-lg font-bold text-white cursor-pointer transition-all hover:opacity-90"
                  style={{ backgroundColor: COLORS.purple }}
                >
                  Book This Trip
                </button>
              </div>
            </div>
          )}

          {/* What's Included */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: COLORS.cardBg, borderColor: "#1E3A5F" }}>
            <h3 className="text-white font-bold text-sm mb-3">Every Charter Includes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { emoji: "🎣", text: "All tackle & bait" },
                { emoji: "🧊", text: "Ice & coolers" },
                { emoji: "📸", text: "Photos of your catch" },
                { emoji: "🎓", text: "USCG licensed captain" },
                { emoji: "🧴", text: "Sunscreen & water" },
                { emoji: "🐟", text: "Fish cleaning service" },
                { emoji: "🦺", text: "Safety equipment" },
                { emoji: "📍", text: "Hotel pickup available" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "#0A1628" }}>
                  <span>{item.emoji}</span>
                  <span className="text-xs" style={{ color: COLORS.lightText }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {step === "book" && selectedTrip && (
        <div className="rounded-xl p-6 border" style={{ backgroundColor: COLORS.cardBg, borderColor: "#1E3A5F" }}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-white font-bold text-lg">{selectedTrip.emoji} {selectedTrip.name}</h3>
              <p className="text-sm" style={{ color: COLORS.midGray }}>{selectedTrip.duration} — ${selectedTrip.price}{selectedTrip.id === "custom" ? "/hr" : ""}</p>
            </div>
            <button onClick={() => { setStep("browse"); setError(""); }} className="text-sm cursor-pointer" style={{ color: COLORS.teal }}>
              ← Change Trip
            </button>
          </div>

          <div className="space-y-4">
            {/* Date & Group Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>Date *</label>
                <select
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">Select a date</option>
                  {getAvailableDates().map((d) => {
                    const date = new Date(d + "T12:00:00");
                    const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    return <option key={d} value={d}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>Departure Time</label>
                <select
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">Default ({selectedTrip.departsAt.split(" or ")[0]})</option>
                  {["5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "12:00 PM", "1:00 PM", "4:00 PM", "5:00 PM"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>Group Size</label>
                <select
                  value={form.groupSize}
                  onChange={(e) => setForm({ ...form, groupSize: Number(e.target.value) })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  {Array.from({ length: selectedTrip.maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "name", label: "Full Name *", placeholder: "John Doe" },
                { key: "email", label: "Email *", placeholder: "john@example.com" },
                { key: "phone", label: "Phone *", placeholder: "(555) 123-4567" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>{field.label}</label>
                  <input
                    type="text"
                    value={form[field.key as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>Special Requests / Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Allergies, experience level, target species, hotel pickup address..."
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
                style={inputStyle}
              />
            </div>

            {/* Summary & Submit */}
            <div className="border-t pt-4" style={{ borderColor: "#1E3A5F" }}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-sm" style={{ color: COLORS.lightText }}>Total</span>
                  <span className="text-2xl font-black ml-3" style={{ color: COLORS.teal }}>
                    ${selectedTrip.id === "custom" ? (selectedTrip.price * 4).toLocaleString() + "+" : selectedTrip.price.toLocaleString()}
                  </span>
                  <span className="text-xs ml-2" style={{ color: COLORS.midGray }}>
                    ({selectedTrip.id === "custom" ? "4hr min" : selectedTrip.priceSol + " SOL"})
                  </span>
                </div>
              </div>

              {error && <p className="text-sm mb-3" style={{ color: "#EF4444" }}>{error}</p>}

              <button
                onClick={handleBook}
                disabled={submitting}
                className="w-full py-3 rounded-lg font-bold text-white cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
                style={{ backgroundColor: COLORS.purple }}
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </button>
              <p className="text-xs text-center mt-2" style={{ color: COLORS.midGray }}>
                50% deposit charged now — remainder due day of trip
              </p>
            </div>
          </div>
        </div>
      )}

      {step === "confirm" && bookingResult && (
        <div className="rounded-xl p-8 border text-center" style={{ backgroundColor: COLORS.cardBg, borderColor: "#1E3A5F" }}>
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-2xl font-black text-white mb-2">You're Booked!</h3>
          <p className="text-sm mb-4" style={{ color: COLORS.lightText }}>
            Confirmation #{bookingResult.id}
          </p>
          <div className="rounded-lg p-4 mb-6 inline-block" style={{ backgroundColor: "#0A1628" }}>
            <p className="text-white font-bold">{selectedTrip?.emoji} {selectedTrip?.name}</p>
            <p className="text-sm" style={{ color: COLORS.teal }}>
              {new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {" at "}{form.time || selectedTrip?.departsAt.split(" or ")[0]}
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.midGray }}>
              {form.groupSize} guest{form.groupSize > 1 ? "s" : ""} — {form.name}
            </p>
          </div>
          <p className="text-sm mb-6" style={{ color: COLORS.lightText }}>
            A confirmation email has been sent to <strong className="text-white">{form.email}</strong>.
            We'll text you the morning of with weather and marina details.
          </p>
          <button
            onClick={() => {
              setStep("browse");
              setSelectedTrip(null);
              setBookingResult(null);
              setForm({ date: "", time: "", groupSize: 2, name: "", email: "", phone: "", notes: "" });
            }}
            className="px-6 py-3 rounded-lg font-bold text-white cursor-pointer transition-all hover:opacity-90"
            style={{ backgroundColor: COLORS.purple }}
          >
            Book Another Trip
          </button>
        </div>
      )}
    </div>
  );
}
