import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AppLayout from "../components/layout/AppLayout";
import TypeaheadInput from "../components/common/TypeaheadInput";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import "./Purchase.css";

const blankLine = () => ({
  id: Date.now() + Math.random(),
  medicine_name: "",
  hsn: "",
  batch: "",
  expiry: "",
  qty: "",
  free: "",
  mrp: "",
  rate: "",
  gst: "",
  amount: 0,
});

function Purchase() {
  const navigate = useNavigate();

  // Supplier details
  const [supplierName, setSupplierName] = useState("");
  const [supplierGst, setSupplierGst] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [invoiceRef, setInvoiceRef] = useState(""); // supplier's invoice/bill no.

  const [purchaseDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Item lines
  const [lines, setLines] = useState([blankLine()]);

  // (Value unused since stock matching moved into the DB RPC; we only refresh it after saves)
  const [, setKnownMedicines] = useState([]);
  const [savedSuppliers, setSavedSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const [{ data: medicines }, { data: suppliers }] = await Promise.all([
        supabase.from("medicines").select("id, medicine_name, hsn, batch, expiry, mrp, rate, gst"),
        supabase.from("suppliers").select("supplier_name, gst_number, phone, address"),
      ]);
      setKnownMedicines(medicines || []);
      setSavedSuppliers(suppliers || []);
    };
    loadData();
  }, []);

  // ---- Calculations -------------------------------------------------------
  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const amount = (Number(line.qty) || 0) * (Number(line.rate) || 0);
        acc.subtotal += amount;
        acc.gst += (amount * (Number(line.gst) || 0)) / 100;
        acc.totalItems += Number(line.qty) || 0;
        return acc;
      },
      { subtotal: 0, gst: 0, totalItems: 0 }
    );
  }, [lines]);

  const grandTotal = totals.subtotal + totals.gst;

  // ---- Line editing -------------------------------------------------------
  const updateLine = (id, updates) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...updates };
        next.amount = (Number(next.qty) || 0) * (Number(next.rate) || 0);
        return next;
      })
    );
  };

  const addLine = () => setLines((prev) => [...prev, blankLine()]);

  const removeLine = (id) => {
    setLines((prev) => {
      const next = prev.filter((line) => line.id !== id);
      return next.length ? next : [blankLine()];
    });
  };

  // Keep one empty row at the bottom for quick entry
  const withEmptyRow = useMemo(() => {
    const hasEmpty = lines.some(
      (l) => !l.medicine_name.trim() && !l.batch && !l.qty
    );
    return hasEmpty ? lines : [...lines, blankLine()];
  }, [lines]);

  // ---- Save ---------------------------------------------------------------
  const validate = () => {
    if (!supplierName.trim()) return "Supplier name is required";
    const valid = lines.filter((l) => l.medicine_name.trim() && Number(l.qty) > 0);
    if (valid.length === 0) return "Add at least one item with name and quantity";
    const badBatch = valid.find((l) => !l.batch.trim());
    if (badBatch) return `Batch number is required for ${badBatch.medicine_name}`;
    const badExpiry = valid.find((l) => !l.expiry.trim());
    if (badExpiry) return `Expiry date is required for ${badExpiry.medicine_name}`;
    return null;
  };

  const savePurchase = async () => {
    const error = validate();
    if (error) {
      alert(error);
      return false;
    }
    if (saving) return false;
    setSaving(true);

    try {
      const validLines = lines.filter(
        (l) => l.medicine_name.trim() && Number(l.qty) > 0
      );

      // Strip local-only row ids; the RPC only needs the business fields
      const rpcItems = validLines.map((l) => ({
        medicine_name: l.medicine_name.trim(),
        hsn: l.hsn,
        batch: l.batch,
        expiry: l.expiry,
        qty: Number(l.qty) || 0,
        free: Number(l.free) || 0,
        mrp: Number(l.mrp) || 0,
        rate: Number(l.rate) || 0,
        gst: Number(l.gst) || 0,
        amount: (Number(l.qty) || 0) * (Number(l.rate) || 0),
      }));

      const purchaseData = {
        supplier_name: supplierName.trim(),
        supplier_gst: supplierGst.trim(),
        supplier_phone: supplierPhone.trim(),
        supplier_address: supplierAddress.trim(),
        invoice_ref: invoiceRef.trim(),
        purchase_date: purchaseDate,
        subtotal: totals.subtotal,
        gst_amount: totals.gst,
        grand_total: grandTotal,
        items: rpcItems,
        created_at: new Date().toISOString(),
      };

      // One atomic call: inserts the purchase AND updates/creates medicines
      // in a single database transaction. Partial saves are impossible.
      const { data: result, error: rpcError } = await supabase.rpc(
        "save_purchase_with_stock",
        { p_purchase: purchaseData }
      );

      if (rpcError) throw rpcError;

      // Refresh local medicine list so stock stays accurate
      const { data: freshMedicines } = await supabase
        .from("medicines")
        .select("id, medicine_name, hsn, batch, expiry, mrp, rate, gst");
      if (freshMedicines) setKnownMedicines(freshMedicines);

      alert(`Purchase saved successfully (${validLines.length} items)`);
      resetForm();
      return result || true;
    } catch (err) {
      console.error("Error saving purchase:", err);
      alert("Failed to save purchase: " + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSupplierName("");
    setSupplierGst("");
    setSupplierPhone("");
    setSupplierAddress("");
    setInvoiceRef("");
    setLines([blankLine()]);
  };

  // ---- Typeahead sources --------------------------------------------------
  const supplierSuggestions = useMemo(
    () =>
      savedSuppliers
        .filter((s) => s.supplier_name)
        .map((s) => ({
          id: s.supplier_name,
          label: s.supplier_name,
          detail: [s.gst_number, s.phone].filter(Boolean).join(" · "),
          raw: s,
        })),
    [savedSuppliers]
  );

  const onSupplierSelect = (suggestion) => {
    setSupplierName(suggestion.label);
    if (suggestion.raw) {
    setSupplierGst(suggestion.raw.gst_number || "");
    setSupplierPhone(suggestion.raw.phone || "");
    setSupplierAddress(suggestion.raw.address || "");
    }
  };

  // ---- Keyboard shortcuts -------------------------------------------------
  const shortcuts = {
    F2: addLine,
    F4: savePurchase,
    F5: () => navigate("/purchase"),
    F6: () => navigate("/customers"),
    F7: () => navigate("/history"),
    F8: () => navigate("/items"),
    F9: () => navigate("/reports"),
    F10: () => navigate("/settings"),
    F11: () => navigate("/purchase-history"),
    "Ctrl+S": savePurchase,
    Escape: resetForm,
  };
  useKeyboardShortcuts(shortcuts);

  // ---- Render -------------------------------------------------------------
  return (
    <AppLayout>
      <div className="erp-page purchase-page">
        <div className="purchase-columns">
          {/* Supplier panel */}
          <div className="supplier-panel">
            <h3>SUPPLIER DETAILS</h3>

            <div className="form-group">
              <label>Supplier Name</label>
              <TypeaheadInput
                value={supplierName}
                onChange={setSupplierName}
                suggestions={supplierSuggestions}
                onSelect={onSupplierSelect}
                placeholder="Type to search suppliers (a-z)..."
              />
            </div>

            <div className="form-group">
              <label>Supplier GST</label>
              <input
                value={supplierGst}
                onChange={(e) => setSupplierGst(e.target.value)}
                placeholder="GST number"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                placeholder="Supplier address"
              />
            </div>

            <div className="form-group">
              <label>Supplier Invoice / Bill No.</label>
              <input
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="Reference on their bill"
              />
            </div>

            <div className="form-group">
              <label>Purchase Date</label>
              <input value={purchaseDate} readOnly />
            </div>
          </div>

          {/* Items grid */}
          <div className="purchase-grid-panel">
            <div className="grid-header">MEDICINES RECEIVED (ENTER MANUALLY)</div>

            <div className="purchase-table-wrap" ref={gridRef}>
              <table className="purchase-table">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>#</th>
                    <th>Medicine Name</th>
                    <th style={{ width: 90 }}>HSN</th>
                    <th style={{ width: 110 }}>Batch No</th>
                    <th style={{ width: 120 }}>Expiry</th>
                    <th style={{ width: 70 }}>Qty</th>
                    <th style={{ width: 70 }}>Free</th>
                    <th style={{ width: 90 }}>MRP</th>
                    <th style={{ width: 90 }}>Rate</th>
                    <th style={{ width: 70 }}>GST%</th>
                    <th style={{ width: 100 }}>Amount</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {withEmptyRow.map((line, idx) => (
                    <tr key={line.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          value={line.medicine_name}
                          onChange={(e) => updateLine(line.id, { medicine_name: e.target.value })}
                          placeholder="Medicine name"
                        />
                      </td>
                      <td>
                        <input
                          value={line.hsn}
                          onChange={(e) => updateLine(line.id, { hsn: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={line.batch}
                          onChange={(e) => updateLine(line.id, { batch: e.target.value })}
                          placeholder="Batch"
                        />
                      </td>
                      <td>
                        <input
                          type="month"
                          value={line.expiry}
                          onChange={(e) => updateLine(line.id, { expiry: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={line.qty}
                          onChange={(e) => updateLine(line.id, { qty: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={line.free}
                          onChange={(e) => updateLine(line.id, { free: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.mrp}
                          onChange={(e) => updateLine(line.id, { mrp: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.rate}
                          onChange={(e) => updateLine(line.id, { rate: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.gst}
                          onChange={(e) => updateLine(line.id, { gst: e.target.value })}
                        />
                      </td>
                      <td className="amount-cell">{line.amount.toFixed(2)}</td>
                      <td>
                        <button
                          className="row-delete-btn"
                          title="Delete row"
                          onClick={() => removeLine(line.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="purchase-footer">
              <button className="btn-primary" onClick={addLine}>
                Add Row (F2)
              </button>
              <button className="btn-primary save-btn" onClick={savePurchase} disabled={saving}>
                {saving ? "Saving..." : "Save Purchase (F4)"}
              </button>
              <button className="btn-secondary" onClick={resetForm}>
                Clear (Esc)
              </button>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="purchase-statusbar">
          <span>Items: {lines.filter((l) => l.medicine_name.trim()).length}</span>
          <span>Units: {totals.totalItems}</span>
          <span>Subtotal: ₹{totals.subtotal.toFixed(2)}</span>
          <span>GST: ₹{totals.gst.toFixed(2)}</span>
          <span className="statusbar-total">Total: ₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </AppLayout>
  );
}

export default Purchase;
