import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = "/tmp/always80-data";
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");

function ensureDataDir() {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
}

interface OrderRecord {
  id: string;
  items: { name: string; price: number; quantity: number; size?: string; merchId?: string }[];
  shipping: { name: string; address: string; city: string; state: string; zip: string };
  email: string;
  paymentMethod: string;
  total: number;
  status: string;
  labelGenerated: boolean;
  createdAt: string;
  // Shipment fields
  weight?: string;
  dimensions?: string;
  requirements?: string;
  shipmentStatus?: string;
  trackingNumber?: string;
  notes?: string;
}

function getOrders(): OrderRecord[] {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}

function saveOrders(orders: OrderRecord[]) {
  ensureDataDir();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function GET() {
  const orders = getOrders();
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, shipping, email, paymentMethod } = body;

    if (!items?.length || !shipping?.name || !shipping?.address || !shipping?.city || !shipping?.state || !shipping?.zip || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order: OrderRecord = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      items,
      shipping,
      email,
      paymentMethod: paymentMethod || "card",
      total: items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0),
      status: "confirmed",
      labelGenerated: false,
      createdAt: new Date().toISOString(),
      // Initialize shipment fields
      weight: "",
      dimensions: "",
      requirements: "",
      shipmentStatus: "Pending",
      trackingNumber: "",
      notes: "",
    };

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    // Deduct purchased quantities from inventory
    try {
      if (fs.existsSync(INVENTORY_FILE)) {
        const invRaw = fs.readFileSync(INVENTORY_FILE, "utf-8");
        const inventory = JSON.parse(invRaw);
        let inventoryUpdated = false;

        for (const orderItem of items) {
          if (!orderItem.merchId) continue;
          const invIdx = inventory.findIndex((inv: { id: string }) => inv.id === orderItem.merchId);
          if (invIdx !== -1) {
            const currentQty = inventory[invIdx].quantity || 0;
            inventory[invIdx].quantity = Math.max(0, currentQty - (orderItem.quantity || 1));
            inventory[invIdx].updatedAt = new Date().toISOString();
            // Auto-set to out_of_stock if quantity hits 0
            if (inventory[invIdx].quantity === 0) {
              inventory[invIdx].status = "out_of_stock";
            }
            inventoryUpdated = true;
          }
        }

        if (inventoryUpdated) {
          fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2));
        }
      }
    } catch (invErr) {
      console.error("Failed to update inventory quantities:", invErr);
      // Order still succeeds even if inventory deduction fails
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

// PATCH — update shipment fields on an existing order
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, ...updates } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const allowedFields = ["weight", "dimensions", "requirements", "shipmentStatus", "trackingNumber", "notes"];
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);

    if (idx === -1) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orders[idx];
    for (const field of allowedFields) {
      if (field in updates) {
        if (field === "weight") order.weight = updates[field];
        else if (field === "dimensions") order.dimensions = updates[field];
        else if (field === "requirements") order.requirements = updates[field];
        else if (field === "shipmentStatus") order.shipmentStatus = updates[field];
        else if (field === "trackingNumber") order.trackingNumber = updates[field];
        else if (field === "notes") order.notes = updates[field];
      }
    }

    saveOrders(orders);
    return NextResponse.json({ order: orders[idx] });
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
