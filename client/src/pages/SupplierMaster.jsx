import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import "./CustomerMaster.css";
import AppLayout from "../components/layout/AppLayout";



function SupplierMaster() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    supplier_name: "",
    gst_number: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          (s.supplier_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.gst_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.phone || "").includes(searchTerm)
      ),
    [searchTerm, suppliers]
  );

  async function loadSuppliers() {
    const { data, error } = await supabase.from("suppliers").select("*");

    if (error) {
      console.error("Error loading suppliers:", error);
    } else {
      setSuppliers(data || []);
    }
  }

  const handleSave = async () => {
    if (!formData.supplier_name.trim()) {
      alert("Supplier name is required");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        alert("Supplier updated successfully");
      } else {
        const { error } = await supabase.from("suppliers").insert([formData]);

        if (error) throw error;
        alert("Supplier added successfully");
      }

      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Error saving supplier: " + error.message);
    }
  };

  const handleEdit = (supplier) => {
    setFormData({
      supplier_name: supplier.supplier_name || "",
      gst_number: supplier.gst_number || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);

      if (error) {
        console.error("Error deleting supplier:", error);
        alert("Error deleting supplier");
      } else {
        alert("Supplier deleted successfully");
        loadSuppliers();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_name: "",
      gst_number: "",
      phone: "",
      address: "",
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
    F8: () => navigate("/items"),
    F10: () => navigate("/settings"),
    F11: () => navigate("/purchase-history"),
    "Ctrl+S": handleSave,
    Escape: resetForm,
  };

  useKeyboardShortcuts(shortcuts);

  return (
    <AppLayout>
      <div className="erp-page customer-master">

        <div className="page-toolbar">
          <input
            type="text"
            placeholder="Search by name, GST, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            Add New Supplier (F2)
          </button>
        </div>

        {showForm && (
          <div className="form-overlay">
            <div className="form-container">
              <h2>{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleFormChange}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button onClick={handleSave} className="btn-success">
                  Save (Ctrl+S)
                </button>
                <button onClick={resetForm} className="btn-secondary">
                  Cancel (Esc)
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>GST Number</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    No suppliers found. Press F2 to add a new supplier.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.supplier_name}</td>
                    <td>{supplier.gst_number}</td>
                    <td>{supplier.phone}</td>
                    <td>{supplier.address}</td>
                    <td className="action-buttons">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="btn-edit"
                        title="Edit"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="btn-delete"
                        title="Delete"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="page-footer">
          <button onClick={() => navigate("/")} className="shortcut-btn">
            F3: Back to Billing
          </button>
          <button onClick={() => navigate("/purchase")} className="shortcut-btn">
            F5: Purchase
          </button>
          <button onClick={() => navigate("/purchase-history")} className="shortcut-btn">
            F11: Purchase History
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default SupplierMaster;
