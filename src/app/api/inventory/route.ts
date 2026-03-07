import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import seedInventory from "@/data/seed-inventory.json";

const DATA_DIR = "/tmp/always80-data";
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INVENTORY_FILE)) {
    // Seed with default products on first cold start
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(seedInventory, null, 2));
  }
}

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

function readItems(): InventoryRecord[] {
  ensureDataDir();
  const raw = fs.readFileSync(INVENTORY_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeItems(items: InventoryRecord[]) {
  ensureDataDir();
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(items, null, 2));
}

// GET — list all inventory items
export async function GET() {
  try {
    const items = readItems();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// POST — add new inventory item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = readItems();

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
    writeItems(items);

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

    const items = readItems();
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

    writeItems(items);
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

    let items = readItems();
    items = items.filter((i) => i.id !== itemId);
    writeItems(items);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Inventory DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
