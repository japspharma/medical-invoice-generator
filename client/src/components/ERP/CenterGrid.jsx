import React, { useState, useRef, useEffect } from "react";

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
  const gridRef = useRef(null);
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

    onUpdateItem(index, updates);
  };

  const handleKeyDown = (e, index) => {
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
              <th style={{ width: "120px" }}>PRODUCT</th>
              <th style={{ width: "50px" }}>HSN</th>
              <th style={{ width: "50px" }}>BATCH</th>
              <th style={{ width: "60px" }}>EXPIRY</th>
              <th style={{ width: "40px" }}>QTY</th>
              <th style={{ width: "40px" }}>FREE</th>
              <th style={{ width: "45px" }}>MRP</th>
              <th style={{ width: "45px" }}>RATE</th>
              <th style={{ width: "40px" }}>GST%</th>
              <th style={{ width: "60px" }}>AMOUNT</th>
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
                    ref={searchInputRef}
                    type="text"
                    value={item.product}
                    readOnly
                    style={{ cursor: "pointer" }}
                  />
                </td>
                <td>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={item.hsn}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={item.batch}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    ref={searchInputRef}
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
                    ref={searchInputRef}
                    type="text"
                    value={item.mrp.toFixed(2)}
                    readOnly
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
                  ref={searchInputRef}
                    type="text"
                    value={item.gst}
                    readOnly
                  />
                </td>
                <td style={{ textAlign: "right", color: "#2ecc71", fontWeight: "bold" }}>
                  ₹{Number(item.amount || 0).toFixed(2)}
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
            {items.length} item(s) | Use ↑↓ to move rows | Enter to next field | Delete to remove
          </span>
        )}
      </div>
    </div>
  );
}

export default CenterGrid;
