import { useState, useRef, useEffect } from "react";

function CenterGrid({
  medicines,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  currentRowIndex,
  setCurrentRowIndex,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const searchInputRef = useRef(null);

  const filteredMedicines = medicines.filter((m) =>
  (m.medicine_name || "")
    .toLowerCase()
    .includes(searchTerm.toLowerCase())
);

  // Auto-focus search field after adding item
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [items.length]);

  const handleSelectMedicine = (medicine) => {
    onAddItem(medicine);
    setSearchTerm("");
    setShowDropdown(false);
    // Auto-focus search field for next item
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  const handleRowClick = (index, field) => {
    setCurrentRowIndex(index);
    setSelectedField(field);
  };

  const handleFieldChange = (index, field, value) => {
    const item = items[index];
    const updates = {};
    updates[field] = value;

    if (field === "qty" || field === "rate") {
      const qty = field === "qty" ? parseFloat(value) || 0 : item.qty;
      const rate = field === "rate" ? parseFloat(value) || 0 : item.rate;
      updates.amount = qty * rate;
    }

    if (field === "freeQty") {
      // Free units are charged nothing; keep amount = qty * rate
      updates.freeQty = parseFloat(value) || 0;
    }

    if (field === "cgstPct" || field === "sgstPct") {
      // The invoice's GST% is the sum of the two halves, so editing
      // either half keeps the printed GST% / totals consistent.
      const cgst = parseFloat(field === "cgstPct" ? value : item.cgstPct) || 0;
      const sgst = parseFloat(field === "sgstPct" ? value : item.sgstPct) || 0;
      updates.gst = Number((cgst + sgst).toFixed(2));
    }

    onUpdateItem(index, updates);
  };

  const handleKeyDown = (e, index) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (index < items.length - 1) {
      document.querySelector(`[data-row="${index + 1}"][data-field="qty"]`)?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();

    if (index < items.length - 1) {
      setCurrentRowIndex(index + 1);
    }
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();

    if (index > 0) {
      setCurrentRowIndex(index - 1);
    }
  }

  if (e.key === "Delete") {
    e.preventDefault();
    onDeleteItem(index);
  }
};

  return (
    <div className="center-grid">
      <div className="grid-header">PRODUCT ENTRY</div>

      <div className="grid-product-search">
        <input
  ref={searchInputRef}
  type="text"
  placeholder="Search & add product"
  value={searchTerm}
  onChange={(e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  }}
  onFocus={() => setShowDropdown(true)}
  onBlur={() =>
  setTimeout(() => setShowDropdown(false), 500)
}
  onKeyDown={(event) => {
    if (event.key === "Enter" && filteredMedicines.length > 0) {
      event.preventDefault();
      handleSelectMedicine(filteredMedicines[0]);
    }
    if (event.key === "Escape") {
      setShowDropdown(false);
    }
  }}
/>
        {showDropdown && filteredMedicines.length > 0 && (
          <div className="grid-product-list">
            {filteredMedicines.slice(0, 8).map((medicine) => (
              <div
 key={medicine.id}
 onMouseDown={() =>
   handleSelectMedicine(medicine)
 }
>
                <strong>{medicine.medicine_name}</strong>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  HSN: {medicine.hsn} | Rate: ₹{medicine.rate} | Exp: {medicine.expiry || "N/A"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: "30px" }}>SL</th>
              <th style={{ width: "110px" }}>PRODUCT</th>
              <th style={{ width: "50px" }}>HSN</th>
              <th style={{ width: "50px" }}>PACK</th>
              <th style={{ width: "50px" }}>BATCH</th>
              <th style={{ width: "60px" }}>EXPIRY</th>
              <th style={{ width: "40px" }}>QTY</th>
              <th style={{ width: "40px" }}>FREE</th>
              <th style={{ width: "45px" }}>MRP</th>
              <th style={{ width: "45px" }}>RATE</th>
              <th style={{ width: "40px" }}>GST%</th>
              <th style={{ width: "42px" }} title="Editable — defaults to half of GST%">CGST%</th>
              <th style={{ width: "42px" }} title="Editable — defaults to half of GST%">SGST%</th>
              <th style={{ width: "60px" }}>AMOUNT</th>
              <th style={{ width: "34px" }} title="Remove item">✕</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={currentRowIndex === index ? "active" : ""}
                onClick={() => handleRowClick(index, "product")}
              >
                <td style={{ textAlign: "center" }}>{index + 1}</td>
                <td>
                  <input
                    type="text"
                    value={item.product}
                    readOnly
                    style={{ cursor: "pointer" }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.hsn}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.pack || ""}
                    onChange={(e) => handleFieldChange(index, "pack", e.target.value)}
                    placeholder="pack"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.batch}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.expiry}
                    readOnly
                  />
                </td>
                <td>
                  <input
  type="number"
  value={item.qty}
  onChange={(e) =>
    handleFieldChange(index,"qty",e.target.value)
  }
  onKeyDown={(e)=>
    handleKeyDown(e,index,"qty")
  }
  data-row={index}
  data-field="qty"
/>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={item.freeQty || 0}
                    onChange={(e) => handleFieldChange(index, "freeQty", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.mrp ?? ""}
                    onChange={(e) => handleFieldChange(index, "mrp", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.rate || ""}
                    onChange={(e) => handleFieldChange(index, "rate", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, "rate")}
                    autoFocus={currentRowIndex === index && selectedField === "rate"}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.gst}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.cgstPct ?? ""}
                    onChange={(e) => handleFieldChange(index, "cgstPct", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.sgstPct ?? ""}
                    onChange={(e) => handleFieldChange(index, "sgstPct", e.target.value)}
                  />
                </td>
                <td style={{ textAlign: "right", color: "#2ecc71", fontWeight: "bold" }}>
                  ₹{Number(item.amount || 0).toFixed(2)}
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="row-remove-btn"
                    title="Remove this medicine"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(index);
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "4px", fontSize: "11px", color: "#666", background: "#f9f9f9" }}>
        {items.length === 0 ? (
          <span>No items. Start typing product name or press F3 to search...</span>
        ) : (
          <span>
            {items.length} item(s) | Use ↑↓ to move rows | Enter to next field | ✕ or Delete key to remove
          </span>
        )}
      </div>
    </div>
  );
}

export default CenterGrid;
