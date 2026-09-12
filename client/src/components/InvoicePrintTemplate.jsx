import React, { forwardRef } from "react";
import "./InvoicePrintTemplate.css";

const InvoicePrintTemplate = forwardRef(({ invoice, settings }, ref) => {
  const amountInWords = (amount) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const scales = ["", "Thousand", "Lakh", "Crore"];

    let num = Math.floor(amount);
    let dec = Math.round((amount - num) * 100);

    if (num === 0) return "Zero";

    let words = [];
    let scaleIndex = 0;

    while (num > 0 && scaleIndex < scales.length) {
      let part = num % (scaleIndex === 0 ? 1000 : 100);
      if (part !== 0) {
        if (scaleIndex > 0) {
          words.unshift(scales[scaleIndex]);
        }
        if (part >= 100) {
          words.unshift(ones[Math.floor(part / 100)] + " Hundred");
          part = part % 100;
        }
        if (part >= 20) {
          words.unshift(tens[Math.floor(part / 10)]);
          part = part % 10;
          if (part > 0) {
            words.unshift(ones[part]);
          }
        } else if (part > 0) {
          words.unshift(ones[part]);
        }
      }
      num = Math.floor(num / (scaleIndex === 0 ? 1000 : 100));
      scaleIndex++;
    }

    return words.join(" ").trim() + (dec > 0 ? " and " + dec + " Paise" : "");
  };

  return (
    <div className="print-template" ref={ref}>
      {/* HEADER */}
      <div className="print-header">
        <table style={{ width: "100%" }}>
  <tbody>
    <tr>
      <td style={{ textAlign: "center" }}>
        <div style={{ fontSize: "20px", fontWeight: "bold" }}>
          TAX INVOICE
        </div>
      </td>
    </tr>
  </tbody>
</table>
      </div>

      {/* COMPANY INFO */}
      <div className="print-company-info">
        <table style={{ width: "100%" }}>
         <tbody>
             <tr>
               <td style={{ width: "60%" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                {settings?.company_name || "JAPS HEALTHCARE"}
              </div>
              <div style={{ fontSize: "11px", marginTop: "2px" }}>
                {settings?.address || "Address not available"}
              </div>
              <div style={{ fontSize: "11px" }}>
                GSTIN: {settings?.gstin || "N/A"}
              </div>
              <div style={{ fontSize: "11px" }}>
                Drug License: {settings?.drug_license || "N/A"}
              </div>
            </td>
            <td style={{ textAlign: "right" }}>
              <table className="print-info-table">
  <tbody>
    <tr>
      <td className="print-label">Invoice No:</td>
      <td className="print-value">{invoice?.invoice_number}</td>
    </tr>
    <tr>
      <td className="print-label">Date:</td>
      <td className="print-value">
        {new Date(invoice?.created_at || new Date()).toLocaleDateString("en-IN")}
      </td>
    </tr>
  </tbody>
</table>
            </td>
    
          </tr>
          </tbody>
        </table>
      </div>

      {/* CUSTOMER INFO */}
      <div className="print-customer-info">
        <table style={{ width: "100%" }}>
            <tbody>
          <tr>
            <td style={{ width: "50%", paddingRight: "10px" }}>
              <div className="print-section-label">Bill To:</div>
              <div className="print-customer-details">
                <div>
                  <strong>{invoice?.customer_name}</strong>
                </div>
                <div>Phone: {invoice?.mobile_number}</div>
                <div>Doctor: {invoice?.doctor_name}</div>
                <div>GST No: {invoice?.gst_number}</div>
                <div>{invoice?.address}</div>
              </div>
            </td>
            <td style={{ width: "50%", paddingLeft: "10px" }}>
              <div className="print-section-label">Invoice Details:</div>
              <table className="print-info-table">
            
                <tr>
                  <td className="print-label">Invoice Type:</td>
                  <td className="print-value">{invoice?.tax_type || "INTRA STATE"}</td>
                </tr>
                <tr>
                  <td className="print-label">Payment Mode:</td>
                  <td className="print-value">{invoice?.payment_type || "CASH"}</td>
                </tr>
              </table>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      {/* ITEMS TABLE */}
      <div className="print-items">
        <table className="print-items-table">
          <thead>
            <tr>
              <th>SL</th>
              <th>PRODUCT</th>
              <th>HSN/SAC</th>
              <th>BATCH</th>
              <th>MRP</th>
              <th>EXP</th>
              <th>QTY</th>
              <th>FREE</th>
              <th>RATE</th>
              <th>GST %</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {invoice?.items?.map((item, index) => (
              <tr key={index}>
                <td style={{ textAlign: "center" }}>{index + 1}</td>
                <td>{item.product}</td>
                <td style={{ textAlign: "center" }}>{item.hsn || "N/A"}</td>
                <td style={{ textAlign: "center" }}>{item.batch || "N/A"}</td>
                <td style={{ textAlign: "right" }}>₹{item.mrp?.toFixed(2) || "0.00"}</td>
                <td style={{ textAlign: "center" }}>{item.expiry || "N/A"}</td>
                <td style={{ textAlign: "center" }}>{item.qty}</td>
                <td style={{ textAlign: "center" }}>{item.freeQty || 0}</td>
                <td style={{ textAlign: "right" }}>₹{item.rate?.toFixed(2) || "0.00"}</td>
                <td style={{ textAlign: "center" }}>{item.gst}%</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  ₹{Number(item.amount || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="print-summary">
        <table style={{ width: "100%" }}>
  <tbody>
    <tr>
      ...
    </tr>

    {invoice?.tax_type === "INTRA STATE" ? (
      <>
        <tr>
          ...
        </tr>
        <tr>
          ...
        </tr>
      </>
    ) : (
      <tr>
        ...
      </tr>
    )}

    <tr>
      ...
    </tr>
  </tbody>
</table>
      </div>

      {/* AMOUNT IN WORDS */}
      <div className="print-amount-words">
        <strong>Amount in Words:</strong> {amountInWords(invoice?.grand_total || 0)}
      </div>

      {/* FOOTER */}
      <div className="print-footer">
        <table style={{ width: "100%", marginTop: "20px" }}>
            <><tbody>
          <tr>
            <td style={{ width: "50%", textAlign: "center" }}>
              <div style={{ marginTop: "30px" }}>
                <strong>Authorized Signatory</strong>
              </div>
            </td>
            <td style={{ width: "50%", textAlign: "center" }}>
              <div style={{ marginTop: "30px" }}>
                <strong>Computer Generated Invoice</strong>
              </div>
            </td>
          </tr>
          
          </tbody>
          </>
        </table>
      </div>
    </div>
  );
});

InvoicePrintTemplate.displayName = "InvoicePrintTemplate";

export default InvoicePrintTemplate;
