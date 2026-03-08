import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const ORDERS_BLOB_KEY = "orders.json";
const LABELS_BLOB_PREFIX = "labels/";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  shipping: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  email: string;
  total: number;
  status: string;
  labelGenerated: boolean;
  createdAt: string;
}

async function getOrders(): Promise<Order[]> {
  try {
    const { blobs } = await list({ prefix: ORDERS_BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

async function saveOrders(orders: Order[]) {
  await put(ORDERS_BLOB_KEY, JSON.stringify(orders, null, 2), {

    access: "private" as any,
    addRandomSuffix: false,
  });
}

// Generate a shipping label as an SVG-based HTML file that can be printed as PDF
function generateLabelHTML(order: Order): string {
  const itemsList = order.items.map((item: OrderItem) => `${item.quantity}x ${item.name}`).join(", ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Shipping Label - ${order.id}</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; width: 4in; height: 6in; padding: 0.25in; background: white; }
    .label { border: 2px solid #000; width: 100%; height: 100%; padding: 0.2in; display: flex; flex-direction: column; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
    .header h1 { font-size: 14px; letter-spacing: 2px; }
    .header p { font-size: 10px; color: #555; }
    .from-section { border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 10px; }
    .from-section .label-text { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .from-section p { font-size: 11px; line-height: 1.4; }
    .to-section { flex: 1; }
    .to-section .label-text { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .to-section .name { font-size: 16px; font-weight: bold; }
    .to-section .address { font-size: 14px; line-height: 1.5; }
    .barcode { text-align: center; border-top: 2px solid #000; padding-top: 8px; margin-top: auto; }
    .barcode .code { font-family: monospace; font-size: 14px; letter-spacing: 3px; }
    .barcode .order-id { font-size: 10px; color: #555; margin-top: 2px; }
    .items { font-size: 9px; color: #666; border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 8px; }
    .weight { font-size: 11px; font-weight: bold; text-align: right; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <h1>ALWAYS 80 AND SUNNY</h1>
      <p>Custom Baits &amp; Tackle</p>
    </div>
    <div class="from-section">
      <p class="label-text">From</p>
      <p>Always 80 and Sunny<br>123 Creator Lane<br>Austin, TX 78701</p>
    </div>
    <div class="to-section">
      <p class="label-text">Ship To</p>
      <p class="name">${order.shipping.name}</p>
      <p class="address">
        ${order.shipping.address}<br>
        ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}
      </p>
      <div class="items">Items: ${itemsList}</div>
      <div class="weight">Weight: ${order.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) * 0.5} lbs</div>
    </div>
    <div class="barcode">
      <div class="code">||||| ${order.id} |||||</div>
      <div class="order-id">Order: ${order.id} | ${new Date(order.createdAt).toLocaleDateString()}</div>
    </div>
  </div>
</body>
</html>`;
}

// GET: Generate label for a specific order
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  const pending = req.nextUrl.searchParams.get("pending");

  // If ?pending=true, return all orders needing labels
  if (pending === "true") {
    const orders = await getOrders();
    const needsLabel = orders.filter((o: Order) => !o.labelGenerated);
    return NextResponse.json({ orders: needsLabel });
  }

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find((o: Order) => o.id === orderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Generate HTML label
  const html = generateLabelHTML(order);

  // Save label to Blob for direct access
  const filename = `label-${order.id}.html`;
  await put(`${LABELS_BLOB_PREFIX}${filename}`, html, {

    access: "private" as any,
    addRandomSuffix: false,
    contentType: "text/html",
  });

  // Mark as generated
  order.labelGenerated = true;
  await saveOrders(orders);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// POST: Generate labels for all pending orders
export async function POST() {
  const orders = await getOrders();
  const pendingOrders = orders.filter((o: Order) => !o.labelGenerated);

  const labels: string[] = [];

  for (const order of pendingOrders) {
    const html = generateLabelHTML(order);
    const filename = `label-${order.id}.html`;
    const blob = await put(`${LABELS_BLOB_PREFIX}${filename}`, html, {
  
      access: "private" as any,
    addRandomSuffix: false,
      contentType: "text/html",
    });
    order.labelGenerated = true;
    labels.push(blob.downloadUrl);
  }

  await saveOrders(orders);

  return NextResponse.json({
    generated: labels.length,
    labels,
    message: labels.length > 0
      ? `Generated ${labels.length} shipping label(s). Open each link in your browser and print to PDF.`
      : "No pending orders needing labels.",
  });
}
