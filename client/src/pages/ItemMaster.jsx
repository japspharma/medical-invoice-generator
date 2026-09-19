import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import "./ItemMasterERP.css";
import AppLayout from "../components/layout/AppLayout";





function ItemMaster() {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    medicine_name: "",
    hsn: "",
    batch: "",
    expiry: "",
    mrp: "",
    rate: "",
    gst: "",
    stock: "",
    minimum_stock: "",
  });

  useEffect(() => {
    loadMedicines();
  }, []);

  const filteredMedicines = useMemo(() => medicines.filter((m) =>
      m.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.hsn && m.hsn.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [searchTerm, medicines]);

  async function loadMedicines() {
    const { data, error } = await supabase.from("medicines").select("*");
    if (error) {
      console.error("Error loading medicines:", error);
    } else {
      setMedicines(data || []);
    }
  }

  const handleSave = async () => {
    if (!formData.medicine_name.trim()) {
      alert("Medicine name is required");
      return;
    }

    try {
      const payload = {
        medicine_name: formData.medicine_name,
        hsn: formData.hsn,
        batch: formData.batch,
        expiry: formData.expiry,
        mrp: parseFloat(formData.mrp) || 0,
        rate: parseFloat(formData.rate) || 0,
        gst: parseFloat(formData.gst) || 0,
        stock: parseInt(formData.stock) || 0,
        minimum_stock: parseInt(formData.minimum_stock) || 0,
      };

      if (editingId) {
        const { error } = await supabase
          .from("medicines")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        alert("Medicine updated successfully");
      } else {
        const { error } = await supabase.from("medicines").insert([payload]);
        if (error) throw error;
        alert("Medicine added successfully");
      }

      resetForm();
      loadMedicines();
    } catch (error) {
      console.error("Error saving medicine:", error);
      alert("Error saving medicine: " + error.message);
    }
  };

  const handleEdit = (medicine) => {
    setFormData({
      medicine_name: medicine.medicine_name,
      hsn: medicine.hsn || "",
      batch: medicine.batch || "",
      expiry: medicine.expiry || "",
      mrp: medicine.mrp || "",
      rate: medicine.rate || "",
      gst: medicine.gst || "",
      stock: medicine.stock || "",
      minimum_stock: medicine.minimum_stock || "",
    });
    setEditingId(medicine.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      const { error } = await supabase.from("medicines").delete().eq("id", id);
      if (error) {
        console.error("Error deleting medicine:", error);
        alert("Error deleting medicine");
      } else {
        alert("Medicine deleted successfully");
        loadMedicines();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      medicine_name: "",
      hsn: "",
      batch: "",
      expiry: "",
      mrp: "",
      rate: "",
      gst: "",
      stock: "",
      minimum_stock: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const shortcuts = {
  F2: () => { resetForm(); setShowForm(true); },
  F5: () => navigate("/purchase"),
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
  F11: () => navigate("/purchase-history"),
  "Ctrl+S": handleSave,
  Escape: resetForm,
};

  useKeyboardShortcuts(shortcuts);

  return (
    <AppLayout>
    <div className="erp-page item-master">
      
      

      <div className="page-toolbar">
        <input
          type="text"
          placeholder="Search by name or HSN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          Add Medicine (F2)
        </button>
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h2>{editingId ? "Edit Medicine" : "Add New Medicine"}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Medicine Name *</label>
                <input type="text" name="medicine_name" value={formData.medicine_name} onChange={handleFormChange} autoFocus />
              </div>
              <div className="form-group">
                <label>HSN Code</label>
                <input type="text" name="hsn" value={formData.hsn} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Batch Number</label>
                <input type="text" name="batch" value={formData.batch} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input type="date" name="expiry" value={formData.expiry} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label>MRP</label>
                <input type="number" name="mrp" value={formData.mrp} onChange={handleFormChange} step="0.01" />
              </div>
              <div className="form-group">
                <label>Selling Rate</label>
                <input type="number" name="rate" value={formData.rate} onChange={handleFormChange} step="0.01" />
              </div>
              <div className="form-group">
                <label>GST %</label>
                <input type="number" name="gst" value={formData.gst} onChange={handleFormChange} step="0.01" />
              </div>
              <div className="form-group">
                <label>Current Stock</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleFormChange} step="1" />
              </div>
              <div className="form-group">
                <label>Minimum Stock Level</label>
                <input type="number" name="minimum_stock" value={formData.minimum_stock} onChange={handleFormChange} step="1" />
              </div>
            </div>

            <div className="form-actions">
              <button onClick={handleSave} className="btn-success">Save (Ctrl+S)</button>
              <button onClick={resetForm} className="btn-secondary">Cancel (Esc)</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>HSN</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>MRP</th>
              <th>Rate</th>
              <th>GST %</th>
              <th>Stock</th>
              <th>Min</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedicines.length === 0 ? (
              <tr>
                <td colSpan="11" className="no-data">No medicines found. Press F2 to add a new medicine.</td>
              </tr>
            ) : (
              filteredMedicines.map((medicine) => {
                const isLowStock = medicine.stock <= medicine.minimum_stock;
                const isExpired = medicine.expiry && new Date(medicine.expiry) < new Date();
                return (
                  <tr key={medicine.id} className={isExpired ? "row-expired" : isLowStock ? "row-low-stock" : ""}>
                    <td>{medicine.medicine_name}</td>
                    <td>{medicine.hsn || "—"}</td>
                    <td>{medicine.batch || "—"}</td>
                    <td>{medicine.expiry ? new Date(medicine.expiry).toLocaleDateString("en-IN") : "—"}</td>
                    <td style={{ textAlign: "right" }}>₹{medicine.mrp?.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>₹{medicine.rate?.toFixed(2)}</td>
                    <td style={{ textAlign: "center" }}>{medicine.gst}%</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{medicine.stock}</td>
                    <td style={{ textAlign: "center" }}>{medicine.minimum_stock}</td>
                    <td>
                      {/* Explicit labels so the column is never ambiguous:
                          EXPIRED = expiry status, LOW STOCK = stock level,
                          IN STOCK = neither. Both badges can show at once. */}
                      {isExpired && <span className="status-expired">EXPIRED</span>}
                      {isLowStock && <span className="status-low">LOW STOCK</span>}
                      {!isExpired && !isLowStock && <span className="status-ok">IN STOCK</span>}
                    </td>
                    <td className="action-buttons">
                      <button onClick={() => handleEdit(medicine)} className="btn-edit" title="Edit">✏️</button>
                      <button onClick={() => handleDelete(medicine.id)} className="btn-delete" title="Delete">🗑️</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="page-footer">
        <button onClick={() => navigate("/")} className="shortcut-btn">F3: Billing</button>
        <button onClick={() => navigate("/history")} className="shortcut-btn">F7: History</button>
        <button onClick={() => navigate("/settings")} className="shortcut-btn">F10: Settings</button>
      </div>
      </div>
    </AppLayout>
  );
}

export default ItemMaster;
