"use client";

import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/utils/colors";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  shipping: { name: string; address: string; city: string; state: string; zip: string };
  email: string;
  total: number;
  createdAt: string;
  weight?: string;
  dimensions?: string;
  requirements?: string;
  shipmentStatus?: string;
  trackingNumber?: string;
  notes?: string;
}

const SHIPMENT_STATUSES = ["Pending", "Packaged", "Shipped", "Delivered"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEE2E2", text: "#991B1B" },
  Packaged: { bg: "#FEF3C7", text: "#92400E" },
  Shipped: { bg: "#DBEAFE", text: "#1E40AF" },
  Delivered: { bg: "#D1FAE5", text: "#065F46" },
};

export default function ShipmentsTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ orderId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);

  const printLabel = async (orderId: string) => {
    setGeneratingLabel(orderId);
    try {
      const url = `/api/shipping-label?orderId=${encodeURIComponent(orderId)}`;
      window.open(url, "_blank");
      // Refresh orders to pick up labelGenerated change
      setTimeout(() => fetchOrders(), 1500);
    } catch (err) {
      console.error("Failed to generate label:", err);
    }
    setGeneratingLabel(null);
  };

  const printAllPending = async () => {
    setGeneratingLabel("all");
    try {
      const res = await fetch("/api/shipping-label", { method: "POST" });
      const data = await res.json();
      if (data.labels && data.labels.length > 0) {
        for (const labelUrl of data.labels) {
          window.open(labelUrl, "_blank");
        }
      }
      setTimeout(() => fetchOrders(), 1500);
    } catch (err) {
      console.error("Failed to generate labels:", err);
    }
    setGeneratingLabel(null);
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        const sorted = data.orders.sort(
          (a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateField = async (orderId: string, field: string, value: string) => {
    setSaving(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, [field]: value }),
      });
      const data = await res.json();
      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
    setSaving(null);
    setEditingCell(null);
  };

  const startEdit = (orderId: string, field: string, currentValue: string) => {
    setEditingCell({ orderId, field });
    setEditValue(currentValue || "");
  };

  const handleKeyDown = (e: React.KeyboardEvent, orderId: string, field: string) => {
    if (e.key === "Enter") {
      updateField(orderId, field, editValue);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatItems = (items: OrderItem[]) => {
    return items
      .map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} ×${i.quantity}`)
      .join(", ");
  };
  void formatItems;

  const filtered = orders.filter((o) => {
    const statusMatch = filterStatus === "all" || (o.shipmentStatus || "Pending") === filterStatus;
    const searchMatch =
      !searchTerm ||
      o.shipping.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  const counts = {
    all: orders.length,
    Pending: orders.filter((o) => !o.shipmentStatus || o.shipmentStatus === "Pending").length,
    Packaged: orders.filter((o) => o.shipmentStatus === "Packaged").length,
    Shipped: orders.filter((o) => o.shipmentStatus === "Shipped").length,
    Delivered: orders.filter((o) => o.shipmentStatus === "Delivered").length,
  };

  const cellStyle = {
    padding: "10px 12px",
    borderBottom: "1px solid #E2E8F0",
    fontSize: "13px",
    color: COLORS.lightText,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  };

  const headerStyle = {
    ...cellStyle,
    color: COLORS.midGray,
    fontWeight: 700,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    backgroundColor: "#F1F5F9",
    position: "sticky" as const,
    top: 0,
    zIndex: 2,
  };

  const renderEditableCell = (
    order: Order,
    field: keyof Order,
    placeholder: string,
    width?: string
  ) => {
    const isEditing = editingCell?.orderId === order.id && editingCell?.field === field;
    const value = (order[field] as string) || "";
    const isSaving = saving === order.id;

    if (isEditing) {
      return (
        <td style={{ ...cellStyle, padding: "4px 6px", minWidth: width }}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, order.id, field)}
            onBlur={() => updateField(order.id, field, editValue)}
            autoFocus
            className="w-full rounded px-2 py-1.5 text-xs outline-none"
            style={{
              backgroundColor: "white",
              color: "#0A1628",
              border: `2px solid ${COLORS.teal}`,
            }}
            placeholder={placeholder}
          />
        </td>
      );
    }

    return (
      <td
        style={{ ...cellStyle, cursor: "pointer", minWidth: width, opacity: isSaving ? 0.5 : 1 }}
        onClick={() => startEdit(order.id, field, value)}
        title={`Click to edit — ${value || placeholder}`}
      >
        {value ? (
          <span style={{ color: "#0A1628" }}>{value}</span>
        ) : (
          <span style={{ color: "#94A3B8", fontStyle: "italic" }}>{placeholder}</span>
        )}
      </td>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#CBD5E1", borderTopColor: COLORS.teal }}
          />
          <p className="text-sm" style={{ color: COLORS.midGray }}>Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "#0A1628" }}>Shipments</h2>
          <p className="text-xs mt-1" style={{ color: COLORS.midGray }}>
            {orders.length} total order{orders.length !== 1 ? "s" : ""} — click any cell to edit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs outline-none w-48"
            style={{
              backgroundColor: "#F1F5F9",
              color: COLORS.lightText,
              border: "1px solid #CBD5E1",
            }}
          />
          <button
            onClick={printAllPending}
            disabled={generatingLabel === "all"}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.teal }}
          >
            {generatingLabel === "all" ? "Generating..." : "Print All Pending Labels"}
          </button>
          <button
            onClick={fetchOrders}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80"
            style={{ backgroundColor: "#E2E8F0", color: COLORS.lightText }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["all", ...SHIPMENT_STATUSES] as const).map((status) => {
          const count = counts[status as keyof typeof counts] || 0;
          const isActive = filterStatus === status;
          const colors = status !== "all" ? STATUS_COLORS[status] : null;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: isActive
                  ? colors?.bg || COLORS.teal
                  : "#F1F5F9",
                color: isActive ? colors?.text || "white" : COLORS.midGray,
                border: `1px solid ${isActive ? (colors?.text || COLORS.teal) + "40" : "#CBD5E1"}`,
              }}
            >
              {status === "all" ? "All" : status} ({count})
            </button>
          );
        })}
      </div>

      {/* Spreadsheet table */}
      <div
        className="rounded-xl border overflow-hidden shadow-sm"
        style={{ borderColor: "#CBD5E1", backgroundColor: "white" }}
      >
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead>
              <tr>
                <th style={{ ...headerStyle, minWidth: "140px" }}>Recipient</th>
                <th style={{ ...headerStyle, minWidth: "100px" }}>Order Date</th>
                <th style={{ ...headerStyle, minWidth: "240px" }}>Items</th>
                <th style={{ ...headerStyle, minWidth: "80px", textAlign: "right" }}>Value</th>
                <th style={{ ...headerStyle, minWidth: "90px" }}>Weight</th>
                <th style={{ ...headerStyle, minWidth: "110px" }}>Dimensions</th>
                <th style={{ ...headerStyle, minWidth: "120px" }}>Requirements</th>
                <th style={{ ...headerStyle, minWidth: "110px" }}>Status</th>
                <th style={{ ...headerStyle, minWidth: "140px" }}>Tracking</th>
                <th style={{ ...headerStyle, minWidth: "100px" }}>Label</th>
                <th style={{ ...headerStyle, minWidth: "160px" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ ...cellStyle, textAlign: "center", padding: "40px 12px" }}>
                    <div>
                      <p className="text-lg mb-1" style={{ color: COLORS.midGray }}>
                        {orders.length === 0 ? "No orders yet" : "No matching orders"}
                      </p>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>
                        {orders.length === 0
                          ? "Orders will appear here automatically when customers purchase merchandise"
                          : "Try adjusting your search or filter"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const shipStatus = order.shipmentStatus || "Pending";
                  const statusColor = STATUS_COLORS[shipStatus] || STATUS_COLORS.Pending;
                  const isSaving = saving === order.id;

                  return (
                    <tr
                      key={order.id}
                      style={{
                        backgroundColor: isSaving ? "#F8FAFC" : "transparent",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSaving)
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSaving)
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ ...cellStyle, minWidth: "140px" }}>
                        <div>
                          <p className="font-semibold text-xs" style={{ color: "#0A1628" }}>{order.shipping.name}</p>
                          <p className="text-xs truncate" style={{ color: "#64748B", maxWidth: "130px" }}>
                            {order.email}
                          </p>
                          <p className="text-xs truncate" style={{ color: "#94A3B8", maxWidth: "130px" }}>
                            {order.shipping.city}, {order.shipping.state} {order.shipping.zip}
                          </p>
                        </div>
                      </td>

                      <td style={cellStyle}>
                        <span className="text-xs">{formatDate(order.createdAt)}</span>
                        <p className="text-xs" style={{ color: "#94A3B8" }}>
                          {order.id.replace("ORD-", "").split("-")[1]}
                        </p>
                      </td>

                      <td style={{ ...cellStyle, minWidth: "240px", whiteSpace: "normal" }}>
                        <div className="space-y-0.5">
                          {order.items.map((item, i) => (
                            <p key={i} className="text-xs">
                              <span style={{ color: "#0A1628" }}>{item.name}</span>
                              {item.size && (
                                <span style={{ color: "#64748B" }}> ({item.size})</span>
                              )}
                              <span style={{ color: COLORS.teal }}> ×{item.quantity}</span>
                            </p>
                          ))}
                        </div>
                      </td>

                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>
                        <span style={{ color: COLORS.teal }}>${order.total.toFixed(2)}</span>
                      </td>

                      {renderEditableCell(order, "weight", "e.g. 1.2 lbs", "90px")}
                      {renderEditableCell(order, "dimensions", 'e.g. 10×8×4"', "110px")}
                      {renderEditableCell(order, "requirements", "e.g. Fragile", "120px")}

                      <td style={{ ...cellStyle, padding: "6px 8px", minWidth: "110px" }}>
                        <select
                          value={shipStatus}
                          onChange={(e) => updateField(order.id, "shipmentStatus", e.target.value)}
                          className="rounded px-2 py-1.5 text-xs font-semibold outline-none cursor-pointer w-full"
                          style={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            border: "1px solid transparent",
                            appearance: "auto",
                          }}
                        >
                          {SHIPMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>

                      {renderEditableCell(order, "trackingNumber", "Enter tracking #", "140px")}

                      {/* Print Label */}
                      <td style={{ ...cellStyle, padding: "6px 8px", minWidth: "100px" }}>
                        <button
                          onClick={() => printLabel(order.id)}
                          disabled={generatingLabel === order.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "#DBEAFE", color: "#1E40AF", border: "1px solid #93C5FD" }}
                        >
                          {generatingLabel === order.id ? "..." : "Print Label"}
                        </button>
                      </td>

                      {renderEditableCell(order, "notes", "Add notes...", "160px")}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary bar */}
      {orders.length > 0 && (
        <div
          className="rounded-xl p-4 flex flex-wrap gap-6 shadow-sm"
          style={{ backgroundColor: "white", border: "1px solid #CBD5E1" }}
        >
          <div>
            <span className="text-xs block" style={{ color: COLORS.midGray }}>Total Revenue</span>
            <span className="text-lg font-black" style={{ color: COLORS.teal }}>
              ${orders.reduce((s, o) => s + o.total, 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: COLORS.midGray }}>Pending</span>
            <span className="text-lg font-black" style={{ color: "#991B1B" }}>{counts.Pending}</span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: COLORS.midGray }}>Packaged</span>
            <span className="text-lg font-black" style={{ color: "#92400E" }}>{counts.Packaged}</span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: COLORS.midGray }}>Shipped</span>
            <span className="text-lg font-black" style={{ color: "#1E40AF" }}>{counts.Shipped}</span>
          </div>
          <div>
            <span className="text-xs block" style={{ color: COLORS.midGray }}>Delivered</span>
            <span className="text-lg font-black" style={{ color: "#065F46" }}>{counts.Delivered}</span>
          </div>
        </div>
      )}
    </div>
  );
}
