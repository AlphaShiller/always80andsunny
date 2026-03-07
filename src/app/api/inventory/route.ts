import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import seedInventory from "@/data/seed-inventory.json";

const BLOB_KEY = "inventory.json";

interface InventoryRecord {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  sizes?: string;
  gender?: string;
  quantity: number;
  weight?: string;
  dimensions?: string;
  cost: number;
  price: number;
  priceSol?: number;
  requirements?: string;
  description?: string;
  sku?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function readItems(): Promise<InventoryRecord[]> {
  try {
    // Check if inventory blob exists
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) {
      // First time — seed with default products
      const seeded = seedInventory as InventoryRecord[];
      await put(BLOB_KEY, JSON.stringify(seeded, null, 2), {
        access: "private",
        addRandomSuffix: false,
      });
      return seeded;
    }
    // Fetch existing data
    const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
    const data = await res.json();
    return data as InventoryRecord[];
  } catch (err) {
    console.error("readItems error:", err);
    return [];
  }
}

async function writeItems(items: InventoryRecord[]) {
  await put(BLOB_KEY, JSON.stringify(items, null, 2), {
    access: "private",
    addRandomSuffix: false,
  });
}

// GET — list all inventory items
export async function GET() {
  try {
    const items = await readItems();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// POST — add new inventory item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = await readItems();

    const newItem: InventoryRecord = {
      id: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: body.name || "Untitled Product",
      category: body.category || "apparel",
      imageUrl: body.imageUrl || "",
      sizes: body.sizes || "",
      gender: body.gender || "unisex",
      quantity: body.quantity || 0,
      weight: body.weight || "",
      dimensions: body.dimensions || "",
      cost: body.cost || 0,
      price: body.price || 0,
      priceSol: body.priceSol || 0,
      requirements: body.requirements || "",
      description: body.description || "",
      sku: body.sku || "",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.push(newItem);
    await writeItems(items);

    return NextResponse.json({ item: newItem });
  } catch (err) {
    console.error("Inventory POST error:", err);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

// PATCH — update an inventory item field
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, ...updates } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }

    const items = await readItems();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Apply updates
    const updatableFields = [
      "name", "category", "imageUrl", "sizes", "gender", "quantity",
      "weight", "dimensions", "cost", "price", "priceSol", "requirements",
      "description", "sku", "status",
    ];

    for (const field of updatableFields) {
      if (field in updates) {
        (items[idx] as unknown as Record<string, unknown>)[field] = updates[field];
      }
    }
    items[idx].updatedAt = new Date().toISOString();

    await writeItems(items);
    return NextResponse.json({ item: items[idx] });
  } catch (err) {
    console.error("Inventory PATCH error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE — remove an inventory item
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }

    let items = await readItems();
    items = items.filter((i) => i.id !== itemId);
    await writeItems(items);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Inventory DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
