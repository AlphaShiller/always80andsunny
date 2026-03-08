import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const ORDERS_BLOB_KEY = "orders.json";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  shipping: { name: string; address: string; city: string; state: string; zip: string };
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
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return await res.json();
  } catch {
    return [];
  }
}

// This endpoint generates all pending labels and returns a summary page
// It's designed to be called by a daily cron job / scheduled task
export async function GET() {
  const orders = await getOrders();

  // Get today's orders (or all pending)
  const today = new Date().toISOString().split("T")[0];
  const todaysOrders = orders.filter((o: Order) => o.createdAt.startsWith(today));
  const pendingLabels = orders.filter((o: Order) => !o.labelGenerated);

  // Generate a summary HTML page with links to all pending labels
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://always80andsunny-r45j.vercel.app";
  const summaryHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Always 80 and Sunny Daily Shipping Labels - ${today}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #0F0A1E; color: #E5E0F0; }
    h1 { color: #9945FF; font-size: 24px; }
    .summary { background: #1A1333; border: 1px solid #2D2550; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .stat { display: inline-block; margin-right: 24px; }
    .stat-num { font-size: 28px; font-weight: 900; color: #14F195; }
    .stat-label { font-size: 12px; color: #6B6085; }
    .order { background: #1A1333; border: 1px solid #2D2550; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .order-id { font-family: monospace; color: #14F195; font-size: 14px; }
    .order-name { color: white; font-weight: bold; font-size: 16px; margin-top: 4px; }
    .order-items { color: #A89EC2; font-size: 13px; margin-top: 4px; }
    a.label-link { display: inline-block; background: #9945FF; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 8px; }
    a.label-link:hover { opacity: 0.9; }
    .empty { text-align: center; padding: 40px; color: #6B6085; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #6B6085; }
  </style>
</head>
<body>
  <h1>Shipping Labels</h1>
  <p style="color: #A89EC2; font-size: 14px;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

  <div class="summary">
    <div class="stat"><div class="stat-num">${todaysOrders.length}</div><div class="stat-label">Orders Today</div></div>
    <div class="stat"><div class="stat-num">${pendingLabels.length}</div><div class="stat-label">Labels Pending</div></div>
    <div class="stat"><div class="stat-num">${orders.length}</div><div class="stat-label">Total Orders</div></div>
  </div>

  ${pendingLabels.length === 0 ? '<div class="empty">No pending shipping labels. All caught up!</div>' : ""}

  ${pendingLabels.map((order: Order) => `
  <div class="order">
    <div class="order-id">${order.id}</div>
    <div class="order-name">${order.shipping.name}</div>
    <div class="order-items">${order.items.map((i: OrderItem) => `${i.quantity}x ${i.name}`).join(", ")} — $${order.total.toFixed(2)}</div>
    <div style="margin-top: 4px; font-size: 12px; color: #6B6085;">${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}</div>
    <a class="label-link" href="${appUrl}/api/shipping-label?orderId=${order.id}" target="_blank">Print Shipping Label</a>
  </div>`).join("")}

  <div class="footer">Always 80 and Sunny — Custom Baits & Tackle | Generated at ${new Date().toLocaleTimeString()}</div>
</body>
</html>`;

  // Save the daily summary page to Blob
  const summaryFilename = `daily-summary-${today}.html`;
  const summaryBlob = await put(`labels/${summaryFilename}`, summaryHTML, {

    access: "public",
    addRandomSuffix: false, allowOverwrite: true,
    contentType: "text/html",
  });

  return NextResponse.json({
    date: today,
    totalOrders: orders.length,
    todaysOrders: todaysOrders.length,
    pendingLabels: pendingLabels.length,
    summaryUrl: summaryBlob.url,
    labelLinks: pendingLabels.map((o: Order) => ({
      orderId: o.id,
      customer: o.shipping.name,
      labelUrl: `${appUrl}/api/shipping-label?orderId=${o.id}`,
    })),
  });
}
