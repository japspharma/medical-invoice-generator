import { forwardRef } from "react";
import "./InvoicePrintTemplate.css";

const COMPANY_DEFAULTS = {
  company_name: "JAPS HEALTHCARE",
  address: "No 3, Thiruveethiamman Koil Street, Koyambedu, Chennai - 600 107",
  gst_number: "33ANBPV8835E2ZT",
  drug_license: "TN-Z05-20B-00168 / TN-Z05-21B-00168",
  account_name: "JAPS HEALTHCARE",
  bank_name: "HDFC BANK LTD",
  account_number: "592099400059095",
  ifsc_code: "HDFC0000082",
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

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

const InvoicePrintTemplate = forwardRef(({ invoice, settings }, ref) => {
  const savedCompanyValues = Object.fromEntries(
    Object.entries(settings || {}).filter(([, value]) => value !== null && value !== "")
  );
  const company = { ...COMPANY_DEFAULTS, ...savedCompanyValues };
  const items = invoice?.items || [];
  const taxAmount = Number(invoice?.gst_amount || 0);
  const isIntraState = invoice?.tax_type !== "INTER STATE";
  const createdAt = invoice?.created_at || new Date().toISOString();

  return (
    <article className="print-template" ref={ref}>
      <header className="invoice-company-header">
        <h1>TAX INVOICE</h1><h2>{company.company_name}</h2><p>{company.address}</p><p>GSTIN: {company.gst_number}</p><p>DL No: {company.drug_license}</p>
      </header>
      <section className="invoice-party-row">
        <div className="invoice-bill-to"><strong>To,</strong><strong>{invoice?.customer_name || "Walk-in Customer"}</strong>{invoice?.address && <span>{invoice.address}</span>}{invoice?.mobile_number && <span>Mobile: {invoice.mobile_number}</span>}{invoice?.gst_number && <span>GSTIN: {invoice.gst_number}</span>}{invoice?.doctor_name && <span>Doctor: {invoice.doctor_name}</span>}</div>
        <div className="invoice-meta"><div className="invoice-meta-spacer" /><div><strong>Invoice No</strong><span>{invoice?.invoice_number || "-"}</span></div><div><strong>Date</strong><span>{new Date(createdAt).toLocaleDateString("en-GB")}</span></div></div>
      </section>
      <table className="invoice-items-table"><thead><tr><th>Sl.No</th><th>Product</th><th>HSN/SAC</th><th>Pack</th><th>B.No</th><th>MRP</th><th>Exp Dt.</th><th>Qty</th><th>Free</th><th>Rate</th><th>GST %</th><th>Amount</th></tr></thead><tbody>
        {items.length ? items.map((item, index) => {
          const amount = Number(item.amount ?? Number(item.qty || 0) * Number(item.rate || 0));
          return <tr key={`${item.id || item.medicine_id || item.product}-${index}`}><td>{index + 1}</td><td className="product-cell">{item.product}</td><td>{item.hsn || "-"}</td><td>{item.pack || "-"}</td><td>{item.batch || "-"}</td><td>{formatMoney(item.mrp)}</td><td>{item.expiry ? new Date(item.expiry).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "-"}</td><td>{item.qty || 0}</td><td>{item.freeQty || 0}</td><td>{formatMoney(item.rate)}</td><td>{item.gst || 0}%</td><td>{formatMoney(amount)}</td></tr>;
        }) : <tr className="empty-item-row"><td colSpan="12">No items</td></tr>}
      </tbody></table>
      <section className="invoice-summary"><div /><div className="invoice-summary-values"><div><span>Goods Value</span><strong>{formatMoney(invoice?.subtotal)}</strong></div>{isIntraState ? <><div><span>CGST Amount</span><strong>{formatMoney(taxAmount / 2)}</strong></div><div><span>SGST Amount</span><strong>{formatMoney(taxAmount / 2)}</strong></div></> : <div><span>IGST Amount</span><strong>{formatMoney(taxAmount)}</strong></div>}<div><span>Round Off</span><strong>0.00</strong></div><div className="invoice-total-row"><span>Invoice Amount ₹</span><strong>{formatMoney(invoice?.grand_total)}</strong></div></div></section>
      <section className="invoice-bottom"><div className="invoice-notes"><p><strong>Party&apos;s order No:</strong></p><p><strong>Note:</strong> Old due 30 strips included</p><p className="amount-words">(Rupees: {amountInWords(invoice?.grand_total)})</p><h3>Terms &amp; Conditions</h3><p>Payment Terms&nbsp;&nbsp;: {invoice?.payment_type || "CASH"}</p><p>Delivery&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</p><p>Thanks for your business.</p><h3>Our Account details for remittance</h3><p>ACCOUNT NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {company.account_name}</p><p>BANK NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {company.bank_name}</p><p>ACCOUNT NUMBER : {company.account_number}</p><p>IFSC CODE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {company.ifsc_code}</p></div><div className="invoice-signatory"><em>For {company.company_name}</em><strong>AUTHORISED SIGNATORY</strong></div></section>
      <footer className="invoice-footer"><strong>This is a computer generated Invoice</strong><div><strong>Goods Once sold can not be taken back</strong><strong>Please Intimate 3 months prior to the expiry of goods if Stocks remain unsold with you</strong><strong>All Disputes Subject to the Chennai Jurisdiction.</strong></div></footer>
    </article>
  );
});

InvoicePrintTemplate.displayName = "InvoicePrintTemplate";
export default InvoicePrintTemplate;
