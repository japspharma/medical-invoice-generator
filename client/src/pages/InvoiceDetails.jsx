import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import InvoicePrintTemplate from "../components/InvoicePrintTemplate";
import "./InvoiceDetails.css";
import AppLayout from "../components/layout/AppLayout";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoiceDetails = async () => {
      setLoading(true);
      const [{ data: invoiceData, error: invoiceError }, { data: settingsData }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", id).single(),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (invoiceError) {
        console.error("Failed to load invoice details:", invoiceError);
      } else {
        setInvoice(invoiceData);
      }
      setSettings(settingsData);
      setLoading(false);
    };
    loadInvoiceDetails();
  }, [id]);

  const printInvoice = () => window.print();
  const shortcuts = {
    F2: () => navigate("/"), F6: () => navigate("/customers"), F7: () => navigate("/history"),
    F8: () => navigate("/items"), F9: printInvoice, F10: () => navigate("/settings"),
    "Ctrl+P": printInvoice, Escape: () => navigate("/history"),
  };
  useKeyboardShortcuts(shortcuts);

  if (loading) return <AppLayout><p className="loading-text">Loading invoice details...</p></AppLayout>;
  if (!invoice) return <AppLayout><p className="error-text">Invoice not found.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="invoice-detail-page">
        <InvoicePrintTemplate invoice={invoice} settings={settings} />
        <div className="invoice-actions">
          <button onClick={() => navigate("/history")}>Back to History</button>
          <button onClick={printInvoice}>Save as PDF</button>
          <button onClick={printInvoice}>Print</button>
        </div>
      </div>
    </AppLayout>
  );
}

export default InvoiceDetails;
