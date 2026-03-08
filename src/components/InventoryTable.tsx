"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { COLORS } from "@/utils/colors";

interface InventoryItem {
  id: string;
  name: string;
  category: "apparel" | "tackle" | "accessory";
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
  status: "active" | "draft" | "out_of_stock";
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["apparel", "tackle", "accessory"] as const;
const STATUSES = ["active", "draft", "out_of_stock"] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#D1FAE5", text: "#065F46" },
  draft: { bg: "#FEF3C7", text: "#92400E" },
  out_of_stock: { bg: "#FEE2E2", text: "#991B1B" },
};

export default function InventoryTable() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "", category: "apparel" as const, sizes: "", gender: "unisex",
    quantity: 0, weight: "", dimensions: "", cost: 0, price: 0, priceSol: 0,
    requirements: "", description: "", sku: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.items) {
        const sorted = data.items.sort(
          (a: InventoryItem, b: InventoryItem) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setItems(sorted);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateField = async (itemId: string, field: string, value: string | number) => {
    setSaving(itemId);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, [field]: value }),
      });
      const data = await res.json();
      if (data.item) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...data.item } : i)));
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
    setSaving(null);
    setEditingCell(null);
  };

  const addItem = async () => {
    if (!newItem.name) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (data.item) {
        setItems((prev) => [data.item, ...prev]);
        setNewItem({
          name: "", category: "apparel", sizes: "", gender: "unisex",
          quantity: 0, weight: "", dimensions: "", cost: 0, price: 0, priceSol: 0,
          requirements: "", description: "", sku: "",
        });
        setShowAddRow(false);
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    setUploadingFor(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", itemId);

      const uploadRes = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.url) {
        await updateField(itemId, "imageUrl", uploadData.url);
      } else {
        console.error("Upload failed:", uploadData.error);
      }
    } catch (err) {
      console.error("Image upload error:", err);
    }
    setUploadingFor(null);
  };

  const startEdit = (itemId: string, field: string, currentValue: string) => {
    setEditingCell({ itemId, field });
    setEditValue(currentValue || "");
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    if (e.key === "Enter") {
      const numericFields = ["quantity", "cost", "price", "priceSol"];
      const val = numericFields.includes(field) ? parseFloat(editValue) || 0 : editValue;
      updateField(itemId, field, val);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const filtered = items.filter((item) => {
    const catMatch = filterCategory === "all" || item.category === filterCategory;
    const searchMatch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    return catMatch && searchMatch;
  });

  const counts = {
    all: items.length,
    apparel: items.filter((i) => i.category === "apparel").length,
    tackle: items.filter((i) => i.category === "tackle").length,
    accessory: items.filter((i) => i.category === "accessory").length,
  };

  const totalValue = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalCost = items.reduce((s, i) => s + (i.cost || 0) * i.quantity, 0);
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const totalProfit = totalValue - totalCost;
  const avgMargin = totalValue > 0 ? ((totalProfit / totalValue) * 100) : 0;
  const outOfStock = items.filter((i) => i.quantity === 0 || i.status === "out_of_stock").length;

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
    item: InventoryItem,
    field: keyof InventoryItem,
    placeholder: string,
    width?: string
  ) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    const value = String(item[field] ?? "");
    const isSaving = saving === item.id;

    if (isEditing) {
      return (
        <td style={{ ...cellStyle, padding: "4px 6px", minWidth: width }}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, item.id, field)}
            onBlur={() => {
              const numericFields = ["quantity", "cost", "price", "priceSol"];
              const val = numericFields.includes(field) ? parseFloat(editValue) || 0 : editValue;
              updateField(item.id, field, val);
            }}
            autoFocus
            className="w-full rounded px-2 py-1.5 text-xs outline-none"
            style={{ backgroundColor: "white", color: "#0A1628", border: `2px solid ${COLORS.teal}` }}
            placeholder={placeholder}
          />
        </td>
      );
    }

    return (
      <td
        style={{ ...cellStyle, cursor: "pointer", minWidth: width, opacity: isSaving ? 0.5 : 1 }}
        onClick={() => startEdit(item.id, field, value)}
        title={`Click to edit — ${value || placeholder}`}
      >
        {value && value !== "0" && value !== "undefined" ? (
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
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#CBD5E1", borderTopColor: COLORS.teal }} />
          <p className="text-sm" style={{ color: COLORS.midGray }}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingFor) {
            handleImageUpload(uploadingFor, file);
          }
          e.target.value = "";
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "#0A1628" }}>Inventory</h2>
          <p className="text-xs mt-1" style={{ color: COLORS.midGray }}>
            {items.length} product{items.length !== 1 ? "s" : ""} — click any cell to edit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs outline-none w-48"
            style={{ backgroundColor: "#F1F5F9", color: COLORS.lightText, border: "1px solid #CBD5E1" }}
          />
          <button
            onClick={() => setShowAddRow(!showAddRow)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 text-white"
            style={{ backgroundColor: COLORS.teal }}
          >
            + Add Product
          </button>
          <button
            onClick={fetchItems}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80"
            style={{ backgroundColor: "#E2E8F0", color: COLORS.lightText }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["all", ...CATEGORIES] as const).map((cat) => {
          const count = counts[cat as keyof typeof counts] || 0;
          const isActive = filterCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all capitalize"
              style={{
                backgroundColor: isActive ? COLORS.teal : "#F1F5F9",
                color: isActive ? "white" : COLORS.midGray,
                border: `1px solid ${isActive ? COLORS.teal : "#CBD5E1"}`,
              }}
            >
              {cat === "all" ? "All" : cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Add New Product Row */}
      {showAddRow && (
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: "#F0FDF4", border: "1px solid #86EFAC" }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: "#065F46" }}>Add New Product</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "name", label: "Product Name", placeholder: "e.g. Custom Swimbait", type: "text" },
              { key: "sku", label: "SKU", placeholder: "e.g. SWM-001", type: "text" },
              { key: "cost", label: "Cost ($)", placeholder: "12.50", type: "number" },
              { key: "price", label: "Price ($)", placeholder: "29.99", type: "number" },
              { key: "priceSol", label: "Price (SOL)", placeholder: "0.22", type: "number" },
              { key: "sizes", label: "Sizes", placeholder: "S, M, L, XL", type: "text" },
              { key: "gender", label: "Gender", placeholder: "mens / womens / unisex", type: "text" },
              { key: "quantity", label: "Quantity", placeholder: "100", type: "number" },
              { key: "weight", label: "Weight", placeholder: "1.2 lbs", type: "text" },
              { key: "dimensions", label: "Dimensions", placeholder: "10×8×4 in", type: "text" },
              { key: "requirements", label: "Requirements", placeholder: "e.g. Keep dry", type: "text" },
              { key: "description", label: "Description", placeholder: "Product description...", type: "text" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#065F46" }}>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={newItem[f.key as keyof typeof newItem] as string}
                  onChange={(e) => setNewItem({ ...newItem, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
                  className="w-full rounded px-2 py-1.5 text-xs outline-none"
                  style={{ backgroundColor: "white", color: "#0A1628", border: "1px solid #CBD5E1" }}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "#065F46" }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value as typeof newItem.category })}
                className="w-full rounded px-2 py-1.5 text-xs outline-none"
                style={{ backgroundColor: "white", color: "#0A1628", border: "1px solid #CBD5E1" }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addItem} className="px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer text-white" style={{ backgroundColor: "#065F46" }}>
              Save Product
            </button>
            <button onClick={() => setShowAddRow(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ backgroundColor: "#E2E8F0", color: COLORS.lightText }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: "#CBD5E1", backgroundColor: "white" }}>
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1800px" }}>
            <thead>
              <tr>
                <th style={{ ...headerStyle, minWidth: "60px" }}>Image</th>
                <th style={{ ...headerStyle, minWidth: "160px" }}>Product Name</th>
                <th style={{ ...headerStyle, minWidth: "200px" }}>Description</th>
                <th style={{ ...headerStyle, minWidth: "80px" }}>SKU</th>
                <th style={{ ...headerStyle, minWidth: "90px" }}>Category</th>
                <th style={{ ...headerStyle, minWidth: "100px" }}>Sizes</th>
                <th style={{ ...headerStyle, minWidth: "80px" }}>Gender</th>
                <th style={{ ...headerStyle, minWidth: "60px", textAlign: "right" }}>Qty</th>
                <th style={{ ...headerStyle, minWidth: "80px", textAlign: "right" }}>Cost</th>
                <th style={{ ...headerStyle, minWidth: "80px", textAlign: "right" }}>Price</th>
                <th style={{ ...headerStyle, minWidth: "70px", textAlign: "right" }}>Margin</th>
                <th style={{ ...headerStyle, minWidth: "80px" }}>Weight</th>
                <th style={{ ...headerStyle, minWidth: "100px" }}>Dimensions</th>
                <th style={{ ...headerStyle, minWidth: "120px" }}>Requirements</th>
                <th style={{ ...headerStyle, minWidth: "90px" }}>Status</th>
                <th style={{ ...headerStyle, minWidth: "80px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ ...cellStyle, textAlign: "center", padding: "40px 12px" }}>
                    <div>
                      <p className="text-lg mb-1" style={{ color: COLORS.midGray }}>
                        {items.length === 0 ? "No products yet" : "No matching products"}
                      </p>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>
                        {items.length === 0
                          ? "Click \"+ Add Product\" to create your first inventory item"
                          : "Try adjusting your search or filter"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.active;
                  const isSaving = saving === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{ backgroundColor: isSaving ? "#F8FAFC" : "transparent", transition: "background-color 0.2s" }}
                      onMouseEnter={(e) => { if (!isSaving) (e.currentTarget as HTMLElement).style.backgroundColor = "#F8FAFC"; }}
                      onMouseLeave={(e) => { if (!isSaving) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                    >
                      {/* Image */}
                      <td style={{ ...cellStyle, minWidth: "60px", padding: "6px 8px" }}>
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center"
                          style={{ backgroundColor: "#F1F5F9", border: "1px dashed #CBD5E1" }}
                          onClick={() => { setUploadingFor(item.id); fileInputRef.current?.click(); }}
                          title="Click to upload image"
                        >
                          {uploadingFor === item.id ? (
                            <span className="text-xs" style={{ color: COLORS.midGray }}>...</span>
                          ) : item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">📷</span>
                          )}
                        </div>
                      </td>

                      {renderEditableCell(item, "name", "Product name", "160px")}
                      {renderEditableCell(item, "description", "Product description for storefront", "200px")}
                      {renderEditableCell(item, "sku", "SKU", "80px")}

                      {/* Category (dropdown) */}
                      <td style={{ ...cellStyle, padding: "6px 8px", minWidth: "90px" }}>
                        <select
                          value={item.category}
                          onChange={(e) => updateField(item.id, "category", e.target.value)}
                          className="rounded px-2 py-1 text-xs outline-none cursor-pointer capitalize"
                          style={{ backgroundColor: "#F1F5F9", color: "#0A1628", border: "1px solid #CBD5E1" }}
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>

                      {renderEditableCell(item, "sizes", "S, M, L, XL", "100px")}
                      {renderEditableCell(item, "gender", "unisex", "80px")}

                      {/* Quantity */}
                      {renderEditableCell(item, "quantity", "0", "60px")}

                      {/* Cost */}
                      <td
                        style={{ ...cellStyle, textAlign: "right", cursor: "pointer", minWidth: "80px" }}
                        onClick={() => startEdit(item.id, "cost", String(item.cost))}
                      >
                        {editingCell?.itemId === item.id && editingCell?.field === "cost" ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.id, "cost")}
                            onBlur={() => updateField(item.id, "cost", parseFloat(editValue) || 0)}
                            autoFocus
                            className="w-full rounded px-2 py-1 text-xs outline-none text-right"
                            style={{ backgroundColor: "white", color: "#0A1628", border: `2px solid ${COLORS.teal}` }}
                          />
                        ) : (
                          <span style={{ color: "#64748B", fontWeight: 600 }}>${(item.cost || 0).toFixed(2)}</span>
                        )}
                      </td>

                      {/* Price */}
                      <td
                        style={{ ...cellStyle, textAlign: "right", cursor: "pointer", minWidth: "80px" }}
                        onClick={() => startEdit(item.id, "price", String(item.price))}
                      >
                        {editingCell?.itemId === item.id && editingCell?.field === "price" ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.id, "price")}
                            onBlur={() => updateField(item.id, "price", parseFloat(editValue) || 0)}
                            autoFocus
                            className="w-full rounded px-2 py-1 text-xs outline-none text-right"
                            style={{ backgroundColor: "white", color: "#0A1628", border: `2px solid ${COLORS.teal}` }}
                          />
                        ) : (
                          <span style={{ color: COLORS.teal, fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Margin */}
                      <td style={{ ...cellStyle, textAlign: "right", minWidth: "70px" }}>
                        {item.price > 0 && item.cost > 0 ? (
                          <span style={{
                            color: ((item.price - item.cost) / item.price) * 100 >= 50 ? "#065F46" : ((item.price - item.cost) / item.price) * 100 >= 25 ? "#92400E" : "#991B1B",
                            fontWeight: 600,
                          }}>
                            {(((item.price - item.cost) / item.price) * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: "#94A3B8", fontStyle: "italic" }}>—</span>
                        )}
                      </td>

                      {renderEditableCell(item, "weight", "lbs", "80px")}
                      {renderEditableCell(item, "dimensions", "L×W×H", "100px")}
                      {renderEditableCell(item, "requirements", "Special reqs", "120px")}

                      {/* Status (dropdown) */}
                      <td style={{ ...cellStyle, padding: "6px 8px", minWidth: "90px" }}>
                        <select
                          value={item.status}
                          onChange={(e) => updateField(item.id, "status", e.target.value)}
                          className="rounded px-2 py-1.5 text-xs font-semibold outline-none cursor-pointer w-full"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: "1px solid transparent" }}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s === "out_of_stock" ? "Out of Stock" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ ...cellStyle, minWidth: "80px", padding: "6px 8px" }}>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="px-2 py-1 rounded text-xs font-semibold cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary bar */}
      <div className="rounded-xl p-4 flex flex-wrap gap-6 shadow-sm" style={{ backgroundColor: "white", border: "1px solid #CBD5E1" }}>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Total Products</span>
          <span className="text-lg font-black" style={{ color: "#0A1628" }}>{items.length}</span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Total Units</span>
          <span className="text-lg font-black" style={{ color: COLORS.teal }}>{totalUnits.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Total Cost</span>
          <span className="text-lg font-black" style={{ color: "#64748B" }}>${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Retail Value</span>
          <span className="text-lg font-black" style={{ color: COLORS.teal }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Potential Profit</span>
          <span className="text-lg font-black" style={{ color: "#065F46" }}>${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Avg Margin</span>
          <span className="text-lg font-black" style={{ color: avgMargin >= 50 ? "#065F46" : avgMargin >= 25 ? "#92400E" : "#991B1B" }}>{avgMargin.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: COLORS.midGray }}>Out of Stock</span>
          <span className="text-lg font-black" style={{ color: outOfStock > 0 ? "#991B1B" : "#065F46" }}>{outOfStock}</span>
        </div>
      </div>
    </div>
  );
}
