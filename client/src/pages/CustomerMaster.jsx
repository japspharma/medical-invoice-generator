import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import "./CustomerMaster.css";
import AppLayout from "../components/layout/AppLayout";





function CustomerMaster() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
  customer_name: "",
  mobile_number: "",
  gst_number: "",
  address: "",
  city: "",
});

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => customers.filter(
      (c) =>
        (c.customer_name || "")
  .toLowerCase()
  .includes(searchTerm.toLowerCase()) ||

(c.mobile_number || "")
  .includes(searchTerm)
    ), [searchTerm, customers]);

  

  async function loadCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*");

  console.log("CUSTOMERS DATA:", data);
  console.log("CUSTOMERS ERROR:", error);

  if (error) {
    console.error("Error loading customers:", error);
  } else {
    setCustomers(data || []);
  }
}

  const handleSave = async () => {
    if (!formData.customer_name.trim()) {
      alert("Customer name is required");
      return;
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        alert("Customer updated successfully");
      } else {
        // Insert
        const { error } = await supabase.from("customers").insert([formData]);

        if (error) throw error;
        alert("Customer added successfully");
      }

      resetForm();
      loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Error saving customer: " + error.message);
    }
  };

  const handleEdit = (customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) {
        console.error("Error deleting customer:", error);
        alert("Error deleting customer");
      } else {
        alert("Customer deleted successfully");
        loadCustomers();
      }
    }
  };

  const resetForm = () => {
    setFormData({
  customer_name: "",
  mobile_number: "",
  gst_number: "",
  address: "",
  city: "",
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
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
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
          placeholder="Search by name, mobile, or GST..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          Add New Customer (F2)
        </button>
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h2>{editingId ? "Edit Customer" : "Add New Customer"}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleFormChange}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="text"
                  name="mobile_number"
value={formData.mobile_number}
                  onChange={handleFormChange}
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
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
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
              <th>Customer Name</th>
<th>Mobile</th>
<th>GST Number</th>
<th>City</th>
<th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No customers found. Press F2 to add a new customer.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.customer_name}</td>
<td>{customer.mobile_number}</td>
<td>{customer.gst_number}</td>
<td>{customer.city}</td>
                  <td className="action-buttons">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="btn-edit"
                      title="Edit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
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
        <button onClick={() => navigate("/history")} className="shortcut-btn">
          F7: Invoice History
        </button>
        <button onClick={() => navigate("/settings")} className="shortcut-btn">
          F10: Settings
        </button>
      </div>
      </div>
    </AppLayout>
  );
}

export default CustomerMaster;
