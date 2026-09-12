import "./InvoiceTable.css";

function InvoiceTable({ items, showActions = false, onViewClick = null }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-items">
        <p>No items in this invoice</p>
      </div>
    );
  }

  return (
    <div className="invoice-table-wrapper">
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Sl</th>
            <th>Product</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>MRP</th>
            <th>GST%</th>
            <th>Amount</th>
            {showActions && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const amount = item.qty * item.mrp;
            return (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{item.product}</td>
                <td>{item.batch}</td>
                <td>{item.qty}</td>
                <td>₹{item.mrp}</td>
                <td>{item.gst}%</td>
                <td>₹{amount.toFixed(2)}</td>
                {showActions && (
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => onViewClick && onViewClick(index)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceTable;
