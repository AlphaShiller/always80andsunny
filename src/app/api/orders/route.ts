import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const ORDERS_BLOB_KEY = "orders.json";
const INVENTORY_BLOB_KEY = "inventory.json";

interface OrderRecord {
  id: string;
  items: { name: string; price: number; quantity: number; size?: string; color?: string; gender?: string; merchId?: string }[];
  shipping: { name: string; address: string; city: string; state: string; zip: string };
  email: string;
  paymentMethod: string;
  total: number;
  shippingCost?: number;
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

interface InventoryItem {
  id: string;
  name: string;
  weight?: string;
  requirements?: string;
  dimensions?: string;
}

// Parse weight string like "1.2 lbs", "0.5 lb", "8 oz" into a number in lbs
function parseWeight(w: string): number {
  if (!w) return 0;
  const lower = w.toLowerCase().trim();
  const num = parseFloat(lower);
  if (isNaN(num)) return 0;
  if (lower.includes("oz")) return num / 16;
  return num; // default assume lbs
}

// Calculate shipping cost based on total weight
// Free over $50 subtotal, otherwise weight-based rates
function calculateShipping(totalWeightLbs: number, subtotal: number): number {
  if (subtotal >= 50) return 0; // free shipping over $50
  if (totalWeightLbs <= 0.5) return 4.99;
  if (totalWeightLbs <= 1) return 5.99;
  if (totalWeightLbs <= 3) return 7.99;
  if (totalWeightLbs <= 5) return 9.99;
  if (totalWeightLbs <= 10) return 12.99;
  return 12.99 + Math.ceil((totalWeightLbs - 10) / 5) * 4.00; // $4 per additional 5 lbs
}

async function getInventory(): Promise<InventoryItem[]> {
  try {
    const { blobs } = await list({ prefix: INVENTORY_BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

async function getOrders(): Promise<OrderRecord[]> {
  try {
    const { blobs } = await list({ prefix: ORDERS_BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

async function saveOrders(orders: OrderRecord[]) {
  await put(ORDERS_BLOB_KEY, JSON.stringify(orders, null, 2), {

    access: "public",
    addRandomSuffix: false, allowOverwrite: true,
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

    // Look up inventory to get weight, requirements, and dimensions for each item
    const inventory = await getInventory();
    let totalWeightLbs = 0;
    const allRequirements: string[] = [];
    const allDimensions: string[] = [];

    for (const orderItem of items) {
      if (!orderItem.merchId) continue;
      const invItem = inventory.find((inv: InventoryItem) => inv.id === orderItem.merchId);
      if (invItem) {
        // Calculate total weight: item weight × quantity ordered
        const itemWeight = parseWeight(invItem.weight || "");
        totalWeightLbs += itemWeight * (orderItem.quantity || 1);

        // Collect requirements (deduplicate)
        if (invItem.requirements && !allRequirements.includes(invItem.requirements)) {
          allRequirements.push(invItem.requirements);
        }

        // Collect dimensions
        if (invItem.dimensions) {
          allDimensions.push(`${orderItem.name}: ${invItem.dimensions}`);
        }
      }
    }

    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
    const shippingCost = calculateShipping(totalWeightLbs, subtotal);

    const order: OrderRecord = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      items,
      shipping,
      email,
      paymentMethod: paymentMethod || "card",
      total: subtotal + shippingCost,
      shippingCost,
      status: "confirmed",
      labelGenerated: false,
      createdAt: new Date().toISOString(),
      weight: totalWeightLbs > 0 ? `${totalWeightLbs.toFixed(2)} lbs` : "",
      dimensions: allDimensions.length > 0 ? allDimensions.join("; ") : "",
      requirements: allRequirements.length > 0 ? allRequirements.join("; ") : "",
      shipmentStatus: "Pending",
      trackingNumber: "",
      notes: "",
    };

    const orders = await getOrders();
    orders.push(order);
    await saveOrders(orders);

    // Deduct purchased quantities from inventory
    try {
      let inventoryUpdated = false;

      for (const orderItem of items) {
        if (!orderItem.merchId) continue;
        const invIdx = inventory.findIndex((inv: InventoryItem) => inv.id === orderItem.merchId);
        if (invIdx !== -1) {
          const invRecord = inventory[invIdx] as InventoryItem & { quantity?: number; status?: string; updatedAt?: string };
          const currentQty = invRecord.quantity || 0;
          invRecord.quantity = Math.max(0, currentQty - (orderItem.quantity || 1));
          invRecord.updatedAt = new Date().toISOString();
          if (invRecord.quantity === 0) {
            invRecord.status = "out_of_stock";
          }
          inventoryUpdated = true;
        }
      }

      if (inventoryUpdated) {
        await put(INVENTORY_BLOB_KEY, JSON.stringify(inventory, null, 2), {
          access: "public",
          addRandomSuffix: false, allowOverwrite: true,
        });
      }
    } catch (invErr) {
      console.error("Failed to update inventory quantities:", invErr);
    }

    return NextResponse.json({ order, shippingCost });
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
