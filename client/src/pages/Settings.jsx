import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Settings.css";
import AppLayout from "../components/layout/AppLayout";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";


// Defaults used when a field has never been saved (DB value null/empty).
// Keys MUST match the real settings table columns: gstin, phone, drug_license,
// account_name, bank_name, account_number, ifsc_code, branch, invoice_prefix.
const DEFAULT_SETTINGS = {
  company_name: "JAPS HEALTHCARE",
  address: "No.3, Thiruveethiamman Koil Street, Koyambedu, Chennai - 600107",
  gstin: "33ANBPV8835E2ZT",
  drug_license: "",
  phone: "",
  invoice_prefix: "INV",
  account_name: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  branch: "",
};

function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

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
        // Merge over defaults so never-saved (null/empty) fields keep
        // sensible values instead of blanking the form.
        setSettings({
          ...DEFAULT_SETTINGS,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== null && v !== "")
          ),
        });
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
                <label htmlFor="gstin">GST Number</label>
                <input
                  type="text"
                  id="gstin"
                  name="gstin"
                  value={settings.gstin}
                  onChange={handleChange}
                  placeholder="Enter GST number"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="drug_license">DL No. (Drug License)</label>
                <input
                  type="text"
                  id="drug_license"
                  name="drug_license"
                  value={settings.drug_license}
                  onChange={handleChange}
                  placeholder="e.g. TN-Z05-20B-00168 / 21B-00168"
                />
                <small style={{ color: "#7f8c8d", fontSize: 11 }}>
                  Prints next to the GSTIN chip on the invoice.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={settings.phone}
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

            <div className="form-section">
              <h2>Bank Details (printed on invoice)</h2>

              <div className="form-group">
                <label htmlFor="account_name">Account Name</label>
                <input
                  type="text"
                  id="account_name"
                  name="account_name"
                  value={settings.account_name}
                  onChange={handleChange}
                  placeholder="e.g. JAPS HEALTHCARE"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bank_name">Bank Name</label>
                <input
                  type="text"
                  id="bank_name"
                  name="bank_name"
                  value={settings.bank_name}
                  onChange={handleChange}
                  placeholder="e.g. HDFC BANK LTD"
                />
              </div>

              <div className="form-group">
                <label htmlFor="account_number">Account Number</label>
                <input
                  type="text"
                  id="account_number"
                  name="account_number"
                  value={settings.account_number}
                  onChange={handleChange}
                  placeholder="Enter account number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ifsc_code">IFSC Code</label>
                <input
                  type="text"
                  id="ifsc_code"
                  name="ifsc_code"
                  value={settings.ifsc_code}
                  onChange={handleChange}
                  placeholder="e.g. HDFC0000082"
                />
              </div>

              <div className="form-group">
                <label htmlFor="branch">Branch</label>
                <input
                  type="text"
                  id="branch"
                  name="branch"
                  value={settings.branch}
                  onChange={handleChange}
                  placeholder="e.g. Koyambedu Branch, Chennai"
                />
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
              <strong>GST:</strong> {settings.gstin}
            </p>
            <p>
              <strong>DL No.:</strong> {settings.drug_license || "Not set"}
            </p>
            <p>
              <strong>Phone:</strong> {settings.phone || "Not set"}
            </p>
            <p>
              <strong>Bank:</strong> {settings.bank_name || "Not set"} — {settings.account_number || "—"}
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
