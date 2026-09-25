
function RightPanel({
  invoiceNumber,
  setInvoiceNumber,
  currentDate,
  setCurrentDate,
  taxType,
  setTaxType,
  paymentType,
  setPaymentType,
  partysOrderNo,
  setPartysOrderNo,
  orderDate,
  setOrderDate,
  dispatchedThrough,
  setDispatchedThrough,
  lrRrNo,
  setLrRrNo,
}) {
  return (
    <div className="right-panel">
      <h3>INVOICE DETAILS</h3>

      <div className="form-group">
        <label>Invoice No.</label>
        <input
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="Invoice number"
        />
      </div>

      <div className="form-group">
        <label>Invoice Date</label>
        <input
          type="date"
          value={currentDate}
          onChange={(e) => setCurrentDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Tax Type</label>
        <select value={taxType} onChange={(e) => setTaxType(e.target.value)}>
          <option>INTRA STATE</option>
          <option>INTER STATE</option>
        </select>
      </div>

      <div className="form-group">
        <label>Payment Type</label>
        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
          <option>CASH</option>
          <option>CHEQUE</option>
          <option>CREDIT</option>
          <option>UPI</option>
          <option>CARD</option>
        </select>
      </div>

      <div className="form-group">
        <label>Party's Order No</label>
        <input
          value={partysOrderNo}
          onChange={(e) => setPartysOrderNo(e.target.value)}
          placeholder="--"
        />
      </div>

      <div className="form-group">
        <label>Order Date</label>
        <input
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          placeholder="--"
        />
      </div>

      <div className="form-group">
        <label>Dispatched Through</label>
        <input
          value={dispatchedThrough}
          onChange={(e) => setDispatchedThrough(e.target.value)}
          placeholder="--"
        />
      </div>

      <div className="form-group">
        <label>LR/RR No</label>
        <input
          value={lrRrNo}
          onChange={(e) => setLrRrNo(e.target.value)}
          placeholder="--"
        />
      </div>
    </div>
  );
}

export default RightPanel;
