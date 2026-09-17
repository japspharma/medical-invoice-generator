import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Settings.css";
import AppLayout from "../components/layout/AppLayout";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";


function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    company_name: "JAPS HEALTHCARE",
    address: "No.3, Thiruveethiamman Koil Street, Koyambedu, Chennai - 600107",
    gst_number: "33ANBPV8835E2ZT",
    phone_number: "",
    invoice_prefix: "INV",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);
  const shortcuts = {
  F2: () => navigate("/"),
  F5: () => navigate("/purchase"),
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
  F11: () => navigate("/purchase-history"),
  "Ctrl+S": () => document.querySelector(".settings-form")?.requestSubmit(),
  Escape: () => navigate("/"),
};
useKeyboardShortcuts(shortcuts);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading settings:", error);
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      // Try to update first
      const { error: updateError, data: updateData } = await supabase
        .from("settings")
        .update(settings)
        .eq("id", 1)
        .select();

      // If no rows were updated, insert instead
      if (updateData && updateData.length === 0) {
        const { error: insertError } = await supabase
          .from("settings")
          .insert([{ id: 1, ...settings }]);

        if (insertError) {
          setMessage("Error saving settings: " + insertError.message);
          return;
        }
      }

      if (updateError) {
        setMessage("Error saving settings: " + updateError.message);
        return;
      }

      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="settings-container">
          <p className="loading-text">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
    

      <div className="settings-container">
        <div className="settings-card">
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-section">
              <h2>Company Information</h2>

              <div className="form-group">
                <label htmlFor="company_name">Company Name</label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={settings.company_name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={settings.address}
                  onChange={handleChange}
                  placeholder="Enter company address"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gst_number">GST Number</label>
                <input
                  type="text"
                  id="gst_number"
                  name="gst_number"
                  value={settings.gst_number}
                  onChange={handleChange}
                  placeholder="Enter GST number"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={settings.phone_number}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-section">
              <h2>Invoice Settings</h2>

              <div className="form-group">
                <label htmlFor="invoice_prefix">Invoice Number Prefix</label>
                <input
                  type="text"
                  id="invoice_prefix"
                  name="invoice_prefix"
                  value={settings.invoice_prefix || "INV"}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="e.g. JAPS (invoices become JAPS-000001)"
                />
                <small style={{ color: "#7f8c8d", fontSize: 11 }}>
                  New invoices will use this prefix + a 6-digit running number from the server.
                </small>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-save"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            {message && (
              <div
                className={`message ${
                  message.includes("successfully") ? "success" : "error"
                }`}
              >
                {message}
              </div>
            )}
          </form>
        </div>

        <div className="settings-info">
          <h2>Current Settings Preview</h2>
          <div className="info-box">
            <p>
              <strong>Company:</strong> {settings.company_name}
            </p>
            <p>
              <strong>Address:</strong> {settings.address}
            </p>
            <p>
              <strong>GST:</strong> {settings.gst_number}
            </p>
            <p>
              <strong>Phone:</strong> {settings.phone_number || "Not set"}
            </p>
            <p>
              <strong>Invoice Prefix:</strong> {settings.invoice_prefix || "INV"}
            </p>
          </div>
        </div>
      </div>
</AppLayout>
  );
}

export default Settings;
