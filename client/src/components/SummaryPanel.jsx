import "./SummaryPanel.css";

function SummaryPanel({ totals }) {
  if (!totals) {
    return null;
  }

  return (
    <div className="summary-panel">
      <h3>Invoice Summary</h3>

      <div className="summary-content">
        <div className="summary-row">
          <span className="label">Sub Total</span>
          <strong className="amount">
            ₹{totals.subtotal?.toFixed(2) || "0.00"}
          </strong>
        </div>

        <div className="summary-row">
          <span className="label">CGST (50%)</span>
          <strong className="amount">
            ₹{(totals.cgst || 0)?.toFixed(2)}
          </strong>
        </div>

        <div className="summary-row">
          <span className="label">SGST (50%)</span>
          <strong className="amount">
            ₹{(totals.sgst || 0)?.toFixed(2)}
          </strong>
        </div>

        <div className="summary-divider"></div>

        <div className="summary-row">
          <span className="label">GST Total</span>
          <strong className="amount gst-total">
            ₹{(totals.gstAmount || 0)?.toFixed(2)}
          </strong>
        </div>

        <div className="grand-total">
          <span className="label">Grand Total</span>
          <strong className="amount grand-total-amount">
            ₹{(totals.grandTotal || 0)?.toFixed(2)}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default SummaryPanel;
