import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import AppLayout from "../components/layout/AppLayout";
import "./Reports.css";

function Reports() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [selectedReport, setSelectedReport] = useState("daily-sales");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    setInvoices(data || []);
  }
  

  const getFilteredInvoices = () => {
    return invoices.filter((inv) => {
      const invDate = new Date(inv.created_at).toISOString().split("T")[0];
      return invDate >= dateRange.start && invDate <= dateRange.end;
    });
  };

  const getDailySalesReport = () => {
    const filtered = getFilteredInvoices();
    const dailyData = {};

    filtered.forEach((inv) => {
      const date = new Date(inv.created_at).toLocaleDateString("en-IN");
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, amount: 0, gst: 0 };
      }
      dailyData[date].count += 1;
      dailyData[date].amount += inv.grand_total || 0;
      dailyData[date].gst += inv.gst_amount || 0;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  

  const getMonthlySalesReport = () => {
    const filtered = getFilteredInvoices();
    const monthlyData = {};

    filtered.forEach((inv) => {
      const date = new Date(inv.created_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, amount: 0, gst: 0 };
      }
      monthlyData[month].count += 1;
      monthlyData[month].amount += inv.grand_total || 0;
      monthlyData[month].gst += inv.gst_amount || 0;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  const getGSTReport = () => {
  const filtered = getFilteredInvoices();

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  filtered.forEach((inv) => {
    if (inv.tax_type === "INTRA STATE") {
      const half = (inv.gst_amount || 0) / 2;

      cgst += half;
      sgst += half;
    } else {
      igst += inv.gst_amount || 0;
    }
  });

  return [
    { type: "CGST", amount: cgst },
    { type: "SGST", amount: sgst },
    { type: "IGST", amount: igst },
    { type: "Total GST", amount: cgst + sgst + igst },
  ];
};

  const getTopProductsReport = () => {
    const filtered = getFilteredInvoices();
    const productData = {};

    filtered.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (!productData[item.product]) {
          productData[item.product] = { qty: 0, amount: 0 };
        }
        productData[item.product].qty += item.qty || 0;
        productData[item.product].amount += item.amount || 0;
      });
    });

    return Object.entries(productData)
      .map(([product, data]) => ({ product, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);
  };
  const shortcuts = {
  F2: () => navigate("/"),
  F5: () => navigate("/purchase"),
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
  F11: () => navigate("/purchase-history"),
};
  useKeyboardShortcuts(shortcuts);

  const renderReport = () => {
    const filtered = getFilteredInvoices();
    const totalAmount = filtered.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
    const totalGST = filtered.reduce((sum, inv) => sum + (inv.gst_amount || 0), 0);

    return (
        
      <>
        <div className="customer-section">
          <div className="field-group">
            <label>Period:</label>
            <span>
              {dateRange.start} to {dateRange.end}
            </span>
          </div>
          <div className="field-group">
            <label>Total Invoices:</label>
            <span>{filtered.length}</span>
          </div>
          <div className="field-group">
            <label>Total Sales:</label>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <label>Total GST:</label>
            <span>₹{totalGST.toFixed(2)}</span>
          </div>
        </div>

        {selectedReport === "daily-sales" && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoices</th>
                <th>Sales Amount</th>
                <th>GST</th>
              </tr>
            </thead>
            <tbody>
              {getDailySalesReport().map((row, idx) => (
                <tr key={idx}>
                  <td>{row.date}</td>
                  <td style={{ textAlign: "center" }}>{row.count}</td>
                  <td style={{ textAlign: "right" }}>₹{row.amount.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>₹{row.gst.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReport === "monthly-sales" && (
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Invoices</th>
                <th>Sales Amount</th>
                <th>GST</th>
              </tr>
            </thead>
            <tbody>
              {getMonthlySalesReport().map((row, idx) => (
                <tr key={idx}>
                  <td>{row.month}</td>
                  <td style={{ textAlign: "center" }}>{row.count}</td>
                  <td style={{ textAlign: "right" }}>₹{row.amount.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>₹{row.gst.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReport === "gst-report" && (
          <table>
            <thead>
              <tr>
                <th>GST Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {getGSTReport().map((row, idx) => (
                <tr key={idx} className={row.type === "Total GST" ? "row-total" : ""}>
                  <td>
                    <strong>{row.type}</strong>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong>₹{row.amount.toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReport === "top-products" && (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Sales Amount</th>
              </tr>
            </thead>
            <tbody>
              {getTopProductsReport().map((row, idx) => (
                <tr key={idx}>
                  <td>{row.product}</td>
                  <td style={{ textAlign: "center" }}>{row.qty}</td>
                  <td style={{ textAlign: "right" }}>₹{row.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  };

  

  return (
    <AppLayout>
    
      <div className="erp-page">
    
      <div className="customer-section">
        <div className="field-group">
          <label>Report Type:</label>
          <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
            <option value="daily-sales">Daily Sales Report</option>
            <option value="monthly-sales">Monthly Sales Report</option>
            <option value="gst-report">GST Report</option>
            <option value="top-products">Top Products</option>
          </select>
        </div>

        <div className="field-group">
          <label>From Date:</label>
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
        </div>

        <div className="field-group">
          <label>To Date:</label>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
        </div>

        <button onClick={() => window.print()} className="btn-print">
          Print Report
        </button>
      </div>

      <div className="report-container">{renderReport()}</div>

      
    </div>
</AppLayout>
  );
}

export default Reports;
