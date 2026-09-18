import { forwardRef } from "react";
import "./InvoicePrintTemplate.css";

const COMPANY_DEFAULTS = {
  company_name: "JAPS HEALTHCARE",
  tagline: "PHARMACEUTICAL & HEALTHCARE FORMULATIONS",
  address: "No. 3, Thiruveethiamman Koil Street, Koyambedu, Chennai - 600 107, Tamil Nadu",
  phone: "+91 44 2479 XXXX , +91 98400 XXXXX",
  email: "billing@japshealthcare.com",
  gstin: "33ANBPV8835E2ZT",
  drug_license: "TN-Z05-20B-00168 / 21B-00168",
  account_name: "JAPS HEALTHCARE",
  bank_name: "HDFC BANK LTD",
  account_number: "592099400059095",
  ifsc_code: "HDFC0000082",
  branch: "Koyambedu Branch, Chennai",
};

const ITEM_ROWS = 12; // fixed row count like the printed format

const inr = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const amountInWords = (amount) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underThousand = (value) => {
    const number = Math.floor(value);
    if (number < 20) return ones[number];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ""}`;
    return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${underThousand(number % 100)}` : ""}`;
  };
  const number = Math.floor(Number(amount || 0));
  if (!number) return "Zero Only";
  const parts = [];
  const crore = Math.floor(number / 10000000);
  const lakh = Math.floor((number % 10000000) / 100000);
  const thousand = Math.floor((number % 100000) / 1000);
  const rest = number % 1000;
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  return `${parts.join(" ")} Only`;
};

const fmtDate = (value) =>
  new Date(value).toLocaleDateString("en-GB").replaceAll("/", ".");

const fmtExpiry = (expiry) => {
  if (!expiry) return "-";
  const date = new Date(expiry);
  if (Number.isNaN(date.getTime())) return expiry;
  return date
    .toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    .replace(" ", "-"); // e.g. "Nov-27"
};

const InvoicePrintTemplate = forwardRef(({ invoice, settings }, ref) => {
  const savedCompanyValues = Object.fromEntries(
    Object.entries(settings || {}).filter(([, value]) => value !== null && value !== "")
  );
  const company = { ...COMPANY_DEFAULTS, ...savedCompanyValues };

  const items = invoice?.items || [];
  const isIntraState = invoice?.tax_type !== "INTER STATE";
  const createdAt = invoice?.created_at || new Date().toISOString();

  const itemAmount = (item) =>
    Number(item.amount ?? Number(item.qty || 0) * Number(item.rate || 0));

  // ---- GST bifurcation: group items by HSN + GST rate --------------------
  const groups = [];
  const groupIndex = {};
  items.forEach((item) => {
    const hsn = item.hsn || "-";
    const gst = Number(item.gst) || 0;
    const key = `${hsn}|${gst}`;
    if (groupIndex[key] === undefined) {
      groupIndex[key] = groups.length;
      groups.push({ hsn, gst, taxable: 0, cgst: 0, sgst: 0, igst: 0 });
    }
    const group = groups[groupIndex[key]];
    const taxable = itemAmount(item);
    group.taxable += taxable;
    if (isIntraState) {
      group.cgst += (taxable * gst) / 200;
      group.sgst += (taxable * gst) / 200;
    } else {
      group.igst += (taxable * gst) / 100;
    }
  });

  const goodsValue = items.reduce((sum, item) => sum + itemAmount(item), 0);
  const taxTotal = Number(invoice?.gst_amount || 0);
  const netRaw = goodsValue + taxTotal;
  const grandTotal = Math.round(netRaw);
  const roundOff = grandTotal - netRaw;
  const roundSign = roundOff >= 0 ? "(+)" : "(-)";

  // Show the rate in labels only when every item shares one GST rate
  const gstRates = [...new Set(items.map((item) => Number(item.gst) || 0))];
  const uniformRate = gstRates.length === 1 ? gstRates[0] : null;

  // Pad the items table to a fixed 12 rows, like the printed format
  const tableRows = [...items];
  while (tableRows.length < ITEM_ROWS) tableRows.push(null);

  return (
    <article className="print-template" ref={ref}>
      <div className="pt-band">TAX INVOICE</div>

      <div className="pt-body">
        {/* Company + invoice number box */}
        <section className="pt-top">
          <div className="pt-company">
            <h1>{company.company_name}</h1>
            <p className="pt-tagline">{company.tagline}</p>
            <p className="pt-addr">{company.address}</p>
            <p className="pt-addr">
              Phone: {company.phone} <span className="pt-sep">|</span> Email: {company.email}
            </p>
            <div className="pt-chips">
              <span className="pt-chip">GSTIN: {company.gstin}</span>
              <span className="pt-chip">DL No: {company.drug_license}</span>
            </div>
          </div>
          <div className="pt-invbox">
            <span className="pt-invbox-label">INVOICE NO:</span>
            <strong className="pt-invbox-no">{invoice?.invoice_number || "-"}</strong>
            <span className="pt-invbox-date">Date: {fmtDate(createdAt)}</span>
          </div>
        </section>

        {/* Buyer + order/dispatch details */}
        <section className="pt-parties">
          <div className="pt-billed">
            <h3 className="pt-heading">BILLED TO / CONSIGNEE</h3>
            <div className="pt-buyer-name">{invoice?.customer_name || "Walk-in Customer"}</div>
            {invoice?.address ? <p className="pt-buyer-addr">{invoice.address}</p> : null}
            <div className="pt-kv">
              <span className="pt-kv-label">Doctor / Clinic:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.doctor_name || "-"}</span>
            </div>
            <div className="pt-kv">
              <span className="pt-kv-label">Phone:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.mobile_number || "-"}</span>
            </div>
            <div className="pt-kv">
              <span className="pt-kv-label">Buyer GSTIN:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">
                {invoice?.gst_number || "(Unregistered)"}
              </span>
            </div>
          </div>

          <div className="pt-dispatch">
            <h3 className="pt-heading">ORDER &amp; DISPATCH DETAILS</h3>
            <div className="pt-kv">
              <span className="pt-kv-label">Party&apos;s Order No:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.party_order_no || ""}</span>
            </div>
            <div className="pt-kv">
              <span className="pt-kv-label">Order Date:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.order_date || ""}</span>
            </div>
            <div className="pt-kv">
              <span className="pt-kv-label">Payment Terms:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.payment_type || "CASH"}</span>
            </div>
            <div className="pt-kv">
              <span className="pt-kv-label">Dispatched Through:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.dispatch_through || ""}</span>
            </div>
            <div className="pt-kv">
              <span className="pt-kv-label">LR / RR No:</span>
              <span className="pt-kv-dots" />
              <span className="pt-kv-value">{invoice?.lr_rr_no || ""}</span>
            </div>
          </div>
        </section>

        {/* Items */}
        <table className="pt-items">
          <thead>
            <tr>
              <th className="pt-col-sl">#</th>
              <th className="pt-col-product">PRODUCT DESCRIPTION</th>
              <th>HSN</th>
              <th>PACK</th>
              <th>BATCH NO</th>
              <th>EXP DT</th>
              <th>MRP (₹)</th>
              <th>QTY</th>
              <th>FREE</th>
              <th>RATE (₹)</th>
              <th>GST %</th>
              <th>AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((item, index) =>
              item ? (
                <tr key={`${item.id || item.medicine_id || item.product}-${index}`}>
                  <td className="pt-col-sl">{index + 1}</td>
                  <td className="pt-product">{item.product}</td>
                  <td>{item.hsn || "-"}</td>
                  <td>{item.pack || ""}</td>
                  <td>{item.batch || "-"}</td>
                  <td>{fmtExpiry(item.expiry)}</td>
                  <td>{inr(item.mrp)}</td>
                  <td>{item.qty || 0}</td>
                  <td>{item.freeQty ?? item.free ?? 0}</td>
                  <td>{inr(item.rate)}</td>
                  <td>{item.gst || 0}%</td>
                  <td className="pt-amount">{inr(itemAmount(item))}</td>
                </tr>
              ) : (
                <tr key={`pad-${index}`}>
                  <td className="pt-col-sl">{index + 1}</td>
                  <td colSpan={11} />
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* Bifurcation + bank | summary */}
        <section className="pt-bottom">
          <div className="pt-bottom-left">
            <div className="pt-box">
              <div className="pt-box-title">
                GST TAX BIFURCATION SCHEDULE (PHARMA COMPLIANCE)
              </div>
              <table className="pt-gst">
                <thead>
                  <tr>
                    <th>HSN/SAC</th>
                    <th>Taxable Val (₹)</th>
                    {isIntraState ? (
                      <>
                        <th>CGST %</th>
                        <th>CGST (₹)</th>
                        <th>SGST %</th>
                        <th>SGST (₹)</th>
                      </>
                    ) : (
                      <>
                        <th>IGST %</th>
                        <th>IGST (₹)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, index) => (
                    <tr key={`${group.hsn}-${index}`}>
                      <td>{group.hsn}</td>
                      <td>{inr(group.taxable)}</td>
                      {isIntraState ? (
                        <>
                          <td>{group.gst / 2}%</td>
                          <td>{inr(group.cgst)}</td>
                          <td>{group.gst / 2}%</td>
                          <td>{inr(group.sgst)}</td>
                        </>
                      ) : (
                        <>
                          <td>{group.gst}%</td>
                          <td>{inr(group.igst)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="pt-gst-total">
                    <td>Total</td>
                    <td>{inr(goodsValue)}</td>
                    {isIntraState ? (
                      <>
                        <td>—</td>
                        <td>{inr(taxTotal / 2)}</td>
                        <td>—</td>
                        <td>{inr(taxTotal / 2)}</td>
                      </>
                    ) : (
                      <>
                        <td>—</td>
                        <td>{inr(taxTotal)}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-box">
              <div className="pt-box-title">BANK DETAILS FOR REMITTANCE</div>
              <div className="pt-bank">
                <div>
                  <span>Account Name:</span>
                  <strong>{company.account_name}</strong>
                </div>
                <div>
                  <span>Bank Name:</span>
                  <strong>{company.bank_name}</strong>
                </div>
                <div>
                  <span>Account Number:</span>
                  <strong>{company.account_number}</strong>
                </div>
                <div>
                  <span>IFSC Code:</span>
                  <strong>{company.ifsc_code}</strong>
                </div>
                <div>
                  <span>Branch:</span>
                  <strong>{company.branch}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-bottom-right">
            <div className="pt-box">
              <div className="pt-box-title">INVOICE SUMMARY</div>
              <div className="pt-summary">
                <div className="pt-sum-row">
                  <span>Total Goods Value (Taxable):</span>
                  <strong>₹{inr(goodsValue)}</strong>
                </div>
                {isIntraState ? (
                  <>
                    <div className="pt-sum-row">
                      <span>
                        Central GST (CGST {uniformRate !== null ? `${uniformRate / 2}%` : ""}):
                      </span>
                      <strong>₹{inr(taxTotal / 2)}</strong>
                    </div>
                    <div className="pt-sum-row">
                      <span>
                        State GST (SGST {uniformRate !== null ? `${uniformRate / 2}%` : ""}):
                      </span>
                      <strong>₹{inr(taxTotal / 2)}</strong>
                    </div>
                  </>
                ) : (
                  <div className="pt-sum-row">
                    <span>Integrated GST (IGST):</span>
                    <strong>₹{inr(taxTotal)}</strong>
                  </div>
                )}
                <div className="pt-sum-row">
                  <span>Total Tax Amount:</span>
                  <strong>₹{inr(taxTotal)}</strong>
                </div>
                <div className="pt-sum-row">
                  <span>Round Off:</span>
                  <strong>
                    {roundSign} {inr(Math.abs(roundOff))}
                  </strong>
                </div>
                <div className="pt-grand">
                  <span>GRAND TOTAL:</span>
                  <strong>₹{inr(grandTotal)}</strong>
                </div>
                <div className="pt-words">
                  <em>
                    <strong>Amount in Words:</strong>
                    <br />
                    Rupees {amountInWords(grandTotal)}
                  </em>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Terms + signatory */}
        <section className="pt-footer">
          <div className="pt-terms">
            <div className="pt-box-title">TERMS &amp; CONDITIONS</div>
            <ol>
              <li>
                Goods once sold will not be accepted back or exchanged under any circumstance.
              </li>
              <li>
                Kindly intimate 3 months prior to expiry if stock remains unsold with you.
              </li>
              <li>
                Interest @ 18% p.a. will be levied on bills unpaid after the agreed credit period.
              </li>
              <li>All disputes are subject to Chennai jurisdiction only.</li>
              <li>
                This is a computer generated invoice and requires authorized signature.
              </li>
            </ol>
          </div>
          <div className="pt-sign">
            <strong>For {company.company_name}</strong>
            <span className="pt-sign-line">Authorised Signatory</span>
          </div>
        </section>
      </div>
    </article>
  );
});

InvoicePrintTemplate.displayName = "InvoicePrintTemplate";
export default InvoicePrintTemplate;
