import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AppLayout from "../components/layout/AppLayout";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import "./PurchaseHistory.css";

function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // purchase awaiting mode choice
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        alert("Failed to load purchases: " + error.message);
        return;
      }
      setPurchases(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return purchases.filter((purchase) => {
      const supplierMatch = (purchase.supplier_name || "")
        .toLowerCase()
        .includes(term);
      const refMatch = (purchase.invoice_ref || "")
        .toLowerCase()
        .includes(term);
      const itemMatch = (purchase.items || []).some((item) =>
        (item.medicine_name || "").toLowerCase().includes(term)
      );
      const matchesSearch = supplierMatch || refMatch || itemMatch;

      const purchaseDay = purchase.purchase_date || "";
      const matchesDate = !filterDate || purchaseDay === filterDate;

      return matchesSearch && matchesDate;
    });
  }, [purchases, searchTerm, filterDate]);

  const filteredTotals = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, purchase) => ({
        items:
          acc.items +
          (purchase.items || []).reduce(
            (sum, item) => sum + (Number(item.qty) || 0) + (Number(item.free) || 0),
            0
          ),
        total: acc.total + (Number(purchase.grand_total) || 0),
      }),
      { items: 0, total: 0 }
    );
  }, [filteredPurchases]);

  const toggleItems = (purchaseId) => {
    setExpandedId((current) => (current === purchaseId ? null : purchaseId));
  };

  const unitsIn = (purchase) =>
    (purchase.items || []).reduce(
      (sum, item) => sum + (Number(item.qty) || 0) + (Number(item.free) || 0),
      0
    );

  const handleDelete = async (mode) => {
    const purchase = deleteTarget;
    if (!purchase || deletingId) return;

    setDeletingId(purchase.id);
    try {
      const rpcName =
        mode === "with-stock" ? "delete_purchase_with_stock" : "delete_purchase_only";
      const { error } = await supabase.rpc(rpcName, {
        p_purchase_id: purchase.id,
      });
      if (error) throw error;

      alert(
        mode === "with-stock"
          ? `Purchase deleted and stock reduced (${unitsIn(purchase)} units removed).`
          : `Purchase record deleted. Stock was NOT changed.`
      );
      setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
      setExpandedId(null);
    } catch (err) {
      console.error("Error deleting purchase:", err);
      alert("Failed to delete purchase: " + err.message);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) {
      alert("No purchases to export");
      return;
    }

    const headers = [
      "Purchase Date",
      "Supplier",
      "Supplier GST",
      "Bill No",
      "Items",
      "Units",
      "Subtotal",
      "GST",
      "Grand Total",
    ];
    const rows = filteredPurchases.map((purchase) => [
      purchase.purchase_date || "",
      purchase.supplier_name,
      purchase.supplier_gst || "",
      purchase.invoice_ref || "",
      purchase.items?.length || 0,
      (purchase.items || []).reduce(
        (sum, item) => sum + (Number(item.qty) || 0) + (Number(item.free) || 0),
        0
      ),
      purchase.subtotal,
      purchase.gst_amount,
      purchase.grand_total,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchases-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const shortcuts = {
    F2: () => navigate("/"),
    F5: () => navigate("/purchase"),
    F6: () => navigate("/customers"),
    F7: () => navigate("/history"),
    F8: () => navigate("/items"),
    F9: () => navigate("/reports"),
    F10: () => navigate("/settings"),
    F11: () => navigate("/purchase-history"),
    Escape: () => setDeleteTarget(null),
  };
  useKeyboardShortcuts(shortcuts);

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-GB")
      : "—";

  return (
    <AppLayout>
      <div className="purchase-history-page">
        <div className="ph-header">
          <div>
            <h1>Purchase History</h1>
            <p>All medicine purchases received from suppliers</p>
          </div>
        </div>

        <div className="ph-toolbar">
          <input
            type="text"
            className="ph-search"
            placeholder="Search by supplier, bill no, or medicine name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className="ph-date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <button
            className="ph-btn ph-btn-export"
            onClick={handleExportCSV}
            disabled={filteredPurchases.length === 0}
          >
            📥 Export CSV
          </button>
          {filterDate && (
            <button className="ph-btn ph-btn-clear" onClick={() => setFilterDate("")}>
              Clear Filter
            </button>
          )}
        </div>

        <div className="ph-stats">
          <div className="ph-stat">
            <h3>Total Purchases</h3>
            <p>{purchases.length}</p>
          </div>
          <div className="ph-stat">
            <h3>Filtered Results</h3>
            <p>{filteredPurchases.length}</p>
          </div>
          <div className="ph-stat">
            <h3>Units Purchased</h3>
            <p>{filteredTotals.items}</p>
          </div>
          <div className="ph-stat">
            <h3>Total Spend</h3>
            <p>₹{filteredTotals.total.toFixed(2)}</p>
          </div>
        </div>

        {loading ? (
          <p className="ph-loading">Loading purchases...</p>
        ) : filteredPurchases.length === 0 ? (
          <p className="ph-empty">
            {searchTerm || filterDate
              ? "No purchases match your search or filter"
              : "No purchases yet — add one from the Purchase page (F5)"}
          </p>
        ) : (
          <div className="ph-table-container">
            <table className="ph-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Bill No</th>
                  <th>Items</th>
                  <th>Units</th>
                  <th>Grand Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <PurchaseRow
                    key={purchase.id}
                    purchase={purchase}
                    expanded={expandedId === purchase.id}
                    onToggle={() => toggleItems(purchase.id)}
                    onDelete={() => setDeleteTarget(purchase)}
                    deleting={deletingId === purchase.id}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="ph-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this purchase?</h3>
            <p className="ph-modal-summary">
              <strong>{deleteTarget.supplier_name}</strong>
              {deleteTarget.invoice_ref ? ` · Bill ${deleteTarget.invoice_ref}` : ""} ·{" "}
              {deleteTarget.items?.length || 0} items · {unitsIn(deleteTarget)} units · ₹
              {Number(deleteTarget.grand_total || 0).toFixed(2)}
            </p>
            <button
              className="ph-modal-btn ph-modal-stock"
              onClick={() => handleDelete("with-stock")}
              disabled={!!deletingId}
            >
              Delete &amp; Reduce Stock
            </button>
            <p className="ph-modal-hint">
              Removes the record AND subtracts {unitsIn(deleteTarget)} units from medicine
              stock. Use when the purchase never actually happened (wrong entry).
              Fails if units were already sold.
            </p>
            <button
              className="ph-modal-btn ph-modal-record"
              onClick={() => handleDelete("record-only")}
              disabled={!!deletingId}
            >
              Delete History Only
            </button>
            <p className="ph-modal-hint">
              Removes only the record. Stock stays as it is — use when the
              medicines were received correctly but the entry is a duplicate
              or you just want to clean the history.
            </p>
            <button
              className="ph-modal-btn ph-modal-cancel"
              onClick={() => setDeleteTarget(null)}
              disabled={!!deletingId}
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function PurchaseRow({
  purchase,
  expanded,
  onToggle,
  onDelete,
  deleting,
  formatDate,
}) {
  const units = (purchase.items || []).reduce(
    (sum, item) => sum + (Number(item.qty) || 0) + (Number(item.free) || 0),
    0
  );

  return (
    <>
      <tr className={expanded ? "ph-row-expanded" : ""}>
        <td>{formatDate(purchase.purchase_date)}</td>
        <td>
          <strong>{purchase.supplier_name}</strong>
          {purchase.supplier_gst ? (
            <div className="ph-subtext">GST: {purchase.supplier_gst}</div>
          ) : null}
        </td>
        <td>{purchase.invoice_ref || "—"}</td>
        <td>{purchase.items?.length || 0}</td>
        <td>{units}</td>
        <td className="ph-amount">₹{Number(purchase.grand_total || 0).toFixed(2)}</td>
        <td>
          <div className="ph-actions">
            <button className="ph-view-btn" onClick={onToggle}>
              {expanded ? "Hide" : "View"}
            </button>
            <button
              className="ph-delete-btn"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "…" : "Delete"}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="ph-items-row">
          <td colSpan={7}>
            <div className="ph-items-wrap">
              <table className="ph-items-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th>Expiry</th>
                    <th>Qty</th>
                    <th>Free</th>
                    <th>MRP</th>
                    <th>Rate</th>
                    <th>GST%</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchase.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.medicine_name}</td>
                      <td>{item.batch || "—"}</td>
                      <td>{item.expiry || "—"}</td>
                      <td>{item.qty}</td>
                      <td>{item.free || 0}</td>
                      <td>₹{Number(item.mrp || 0).toFixed(2)}</td>
                      <td>₹{Number(item.rate || 0).toFixed(2)}</td>
                      <td>{item.gst || 0}%</td>
                      <td>₹{Number(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default PurchaseHistory;
