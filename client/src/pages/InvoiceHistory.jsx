import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./InvoiceHistory.css";
import AppLayout from "../components/layout/AppLayout";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";





function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const navigate = useNavigate();

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Invoices Data:", data);
      console.log("Invoices Error:", error);

      if (error) {
        alert("Failed to load invoices");
        return;
      }

      setInvoices(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoice_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        invoice.customer_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const invoiceDate = new Date(invoice.created_at)
        .toLocaleDateString("en-GB")
        .replaceAll("/", "-");
      const filterDateFormatted = filterDate
        ? new Date(filterDate).toLocaleDateString("en-GB").replaceAll("/", "-")
        : "";

      const matchesDate =
        !filterDate || invoiceDate.includes(filterDateFormatted);

      return matchesSearch && matchesDate;
    });
  }, [invoices, searchTerm, filterDate]);

  const handleViewInvoice = (invoiceId) => {
    navigate(`/history/${invoiceId}`);
  };

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert("No invoices to export");
      return;
    }

    const headers = [
      "Invoice No",
      "Customer Name",
      "Mobile Number",
      "Doctor Name",
      "Tax Type",
      "Subtotal",
      "GST Amount",
      "Grand Total",
      "Date",
    ];

    const rows = filteredInvoices.map((invoice) => [
      invoice.invoice_number,
      invoice.customer_name,
      invoice.mobile_number,
      invoice.doctor_name,
      invoice.tax_type,
      invoice.subtotal,
      invoice.gst_amount,
      invoice.grand_total,
      new Date(invoice.created_at).toLocaleDateString("en-GB"),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  const shortcuts = {
  F2: () => navigate("/"),
  F5: () => navigate("/purchase"),
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
};
useKeyboardShortcuts(shortcuts);

  return (
    <AppLayout>
        <div className="erp-page-header">
  <div>
    <h1>Invoice History</h1>
    <p>Manage and view all invoices</p>
  </div>
</div>
    

      <div className="erp-page">
        <div className="erp-card">
            <div className="erp-panel"></div>
         <div className="page-toolbar">
          <div className="filter-group">
            <input
              type="text"
              className="search-input"
              placeholder="Search by invoice number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <input
              type="date"
              className="date-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <button
            className="btn-export"
            onClick={handleExportCSV}
            disabled={filteredInvoices.length === 0}
          >
            📥 Export CSV
          </button>

          {filterDate && (
            <button
              className="btn-clear"
              onClick={() => setFilterDate("")}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

        <div className="dashboard-grid">
          <div className="stat-box">
            <h3>Total Invoices</h3>
            <p className="stat-value">{invoices.length}</p>
          </div>
          <div className="stat-box">
            <h3>Filtered Results</h3>
            <p className="stat-value">{filteredInvoices.length}</p>
          </div>
          <div className="stat-box">
            <h3>Total Revenue</h3>
            <p className="stat-value">
              ₹
              {filteredInvoices
                .reduce((sum, inv) => sum + (inv.grand_total || 0), 0)
                .toFixed(2)}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading invoices...</p>
        ) : filteredInvoices.length === 0 ? (
          <p className="empty-text">
            {searchTerm || filterDate
              ? "No invoices match your search or filter"
              : "No invoices found"}
          </p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Date</th>
                  <th>Grand Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoice_number}</strong>
                    </td>
                    <td>{invoice.customer_name}</td>
                    <td>{invoice.mobile_number}</td>
                    <td>
                      {new Date(invoice.created_at).toLocaleDateString(
                        "en-GB"
                      )}
                    </td>
                    <td className="amount">
                      ₹{invoice.grand_total?.toFixed(2) || "0.00"}
                    </td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() =>
                          handleViewInvoice(invoice.id)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default InvoiceHistory;