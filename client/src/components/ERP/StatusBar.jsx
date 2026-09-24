function StatusBar({ itemCount, subtotal, gstAmount, taxType, grandTotal }) {
  return (
    <div className="status-bar">
      <div className="status-item">
        <label className="status-label">Rows:</label>
        <span className="status-value">{itemCount}</span>
      </div>

      <div className="status-item">
        <label className="status-label">Subtotal:</label>
        <span className="status-value">₹ {subtotal.toFixed(2)}</span>
      </div>

      <div className="status-item">
        <label className="status-label">GST:</label>
        <span className="status-value">₹ {gstAmount.toFixed(2)}</span>
      </div>

      {taxType === "INTER STATE" ? (
        <div className="status-item">
          <label className="status-label">IGST:</label>
          <span className="status-value">₹ {gstAmount.toFixed(2)}</span>
        </div>
      ) : null}

      <div className="status-item">
        <label className="status-label">Grand Total:</label>
        <span className="status-value" style={{ color: "#2ecc71", fontWeight: "bold" }}>
          ₹ {grandTotal.toFixed(2)}
        </span>
      </div>

      <div style={{ marginLeft: "auto" }}>
        <small style={{ color: "#bdc3c7" }}>
          Press F2-F10 for menu | Enter to navigate | Esc to clear
        </small>
      </div>
    </div>
  );
}

export default StatusBar;
