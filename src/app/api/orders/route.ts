import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const ORDERS_BLOB_KEY = "orders.json";
const INVENTORY_BLOB_KEY = "inventory.json";

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

async function getOrders(): Promise<OrderRecord[]> {
  try {
    const { blobs } = await list({ prefix: ORDERS_BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

async function saveOrders(orders: OrderRecord[]) {
  await put(ORDERS_BLOB_KEY, JSON.stringify(orders, null, 2), {
    access: "private",
    addRandomSuffix: false,
  });
}

export async function GET() {
  const orders = await getOrders();
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
      weight: "",
      dimensions: "",
      requirements: "",
      shipmentStatus: "Pending",
      trackingNumber: "",
      notes: "",
    };

    const orders = await getOrders();
    orders.push(order);
    await saveOrders(orders);

    // Deduct purchased quantities from inventory
    try {
      const { blobs } = await list({ prefix: INVENTORY_BLOB_KEY });
      if (blobs.length > 0) {
        const invRes = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
        const inventory = await invRes.json();
        let inventoryUpdated = false;

        for (const orderItem of items) {
          if (!orderItem.merchId) continue;
          const invIdx = inventory.findIndex((inv: { id: string }) => inv.id === orderItem.merchId);
          if (invIdx !== -1) {
            const currentQty = inventory[invIdx].quantity || 0;
            inventory[invIdx].quantity = Math.max(0, currentQty - (orderItem.quantity || 1));
            inventory[invIdx].updatedAt = new Date().toISOString();
            if (inventory[invIdx].quantity === 0) {
              inventory[invIdx].status = "out_of_stock";
            }
            inventoryUpdated = true;
          }
        }

        if (inventoryUpdated) {
          await put(INVENTORY_BLOB_KEY, JSON.stringify(inventory, null, 2), {
            access: "private",
            addRandomSuffix: false,
          });
        }
      }
    } catch (invErr) {
      console.error("Failed to update inventory quantities:", invErr);
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
    const orders = await getOrders();
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

    await saveOrders(orders);
    return NextResponse.json({ order: orders[idx] });
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
