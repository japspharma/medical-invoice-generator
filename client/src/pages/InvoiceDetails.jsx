import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import InvoiceTable from "../components/InvoiceTable";
import SummaryPanel from "../components/SummaryPanel";
import "./InvoiceDetails.css";
import AppLayout from "../components/layout/AppLayout";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";





function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const shortcuts = {
  F2: () => navigate("/"),
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
};
useKeyboardShortcuts(shortcuts);

  const loadInvoiceDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert("Failed to load invoice details");
        console.error(error);
        return;
      }

      setInvoice(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <div className="company-info">
            <h1>JAPS HEALTHCARE</h1>
          </div>
        </header>
        <p className="loading-text">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="app">
        <header className="header">
          <div className="company-info">
            <h1>JAPS HEALTHCARE</h1>
          </div>
        </header>
        <p className="error-text">Invoice not found</p>
      </div>
    );
  }

  const handlePrint = () => {
  console.log(document.querySelector(".invoice-print-container"));
  window.print();
};

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(102, 126, 234);
      doc.text("JAPS HEALTHCARE", pageWidth / 2, yPosition, {
        align: "center",
      });

      yPosition += 7;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("No.3, Thiruveethiamman Koil Street", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 5;
      doc.text(
        "Koyambedu, Chennai - 600107",
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 5;
      doc.text("GSTIN: 33ANBPV8835E2ZT", pageWidth / 2, yPosition, {
        align: "center",
      });

      yPosition += 12;
      doc.setDrawColor(102, 126, 234);
      doc.line(15, yPosition, pageWidth - 15, yPosition);

      yPosition += 8;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.text("INVOICE DETAILS", 15, yPosition);

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");

      const detailsData = [
        ["Invoice No:", invoice.invoice_number],
        ["Date:", new Date(invoice.created_at).toLocaleDateString("en-GB")],
        ["Tax Type:", invoice.tax_type],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [],
        body: detailsData,
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 100 } },
        margin: { left: 15, right: 15 },
        didDrawPage: () => {},
      });

      yPosition = doc.lastAutoTable.finalY + 10;

      doc.setFont(undefined, "bold");
      doc.text("CUSTOMER INFORMATION", 15, yPosition);
      yPosition += 10;

      const customerData = [
        ["Customer Name:", invoice.customer_name],
        ["Mobile Number:", invoice.mobile_number],
        ["Doctor Name:", invoice.doctor_name],
      ];

      doc.setFont(undefined, "normal");
      doc.autoTable({
        startY: yPosition,
        head: [],
        body: customerData,
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 100 } },
        margin: { left: 15, right: 15 },
      });

      yPosition = doc.lastAutoTable.finalY + 10;

      doc.setFont(undefined, "bold");
      doc.text("LINE ITEMS", 15, yPosition);
      yPosition += 10;

      const itemsData = invoice.items.map((item) => [
        item.product,
        item.batch,
        item.qty.toString(),
        "₹" + item.mrp.toFixed(2),
        item.gst.toFixed(2) + "%",
        "₹" + (item.qty * item.mrp).toFixed(2),
      ]);

      doc.setFont(undefined, "normal");
      doc.autoTable({
        startY: yPosition,
        head: [["Product", "Batch", "Qty", "MRP", "GST%", "Amount"]],
        body: itemsData,
        margin: { left: 15, right: 15 },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;

      const summaryData = [
        ["Sub Total:", "₹" + invoice.subtotal.toFixed(2)],
        [
          "CGST (50%):",
          "₹" + (invoice.gst_amount / 2).toFixed(2),
        ],
        [
          "SGST (50%):",
          "₹" + (invoice.gst_amount / 2).toFixed(2),
        ],
        ["GST Total:", "₹" + invoice.gst_amount.toFixed(2)],
        [
          "Grand Total:",
          "₹" + invoice.grand_total.toFixed(2),
        ],
      ];

      doc.setFont(undefined, "bold");
      doc.autoTable({
        startY: yPosition,
        head: [],
        body: summaryData,
        columnStyles: {
          0: { cellWidth: 80, fontStyle: "bold" },
          1: { cellWidth: 70 },
        },
        margin: { left: 15, right: 15 },
      });

      const fileName = `INV-${invoice.invoice_number}-${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      alert("Error generating PDF: " + error.message);
      console.error(error);
    }
  };

  const handleBack = () => {
    navigate("/history");
  };

  const totals = {
    subtotal: invoice.subtotal,
    gstAmount: invoice.gst_amount,
    cgst: invoice.gst_amount / 2,
    sgst: invoice.gst_amount / 2,
    grandTotal: invoice.grand_total,
  };
  console.log(invoice);
  return (
  <AppLayout>
    <div className="invoice-print-container">

      <div className="invoice-header">
        <div>
          <h1>JAPS HEALTHCARE</h1>
          <p>No.3, Thiruveethiamman Koil Street</p>
          <p>Koyambedu, Chennai - 600107</p>
          <p>GSTIN: 33ANBPV8835E2ZT</p>
        </div>

        <div className="invoice-info">
          <h2>TAX INVOICE</h2>
          <p>
            <strong>Invoice No:</strong> {invoice.invoice_number}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {new Date(invoice.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>

      <div className="customer-details">
        <h3>Bill To</h3>
        <p>{invoice.customer_name}</p>
        <p>{invoice.mobile_number}</p>
      </div>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Medicine</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>MRP</th>
            <th>GST%</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {invoice?.items?.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.product}</td>
              <td>{item.batch}</td>
              <td>{item.qty}</td>
              <td>₹{item.mrp}</td>
              <td>{item.gst}%</td>
              <td>₹{(item.qty * item.mrp).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-totals">
        <p>Sub Total : ₹{invoice.subtotal}</p>
        <p>GST : ₹{invoice.gst_amount}</p>
        <h2>Grand Total : ₹{invoice.grand_total}</h2>
      </div>

      <div className="invoice-actions">
        <button onClick={handleBack}>
          Back
        </button>

        <button onClick={handleDownloadPDF}>
          Download PDF
        </button>

        <button onClick={handlePrint}>
          Print
        </button>
      </div>

    </div>
  </AppLayout>
);
}

export default InvoiceDetails;