import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./ERP.css";
import LeftPanel from "../components/ERP/LeftPanel";
import CenterGrid from "../components/ERP/CenterGrid";
import RightPanel from "../components/ERP/RightPanel";
import StatusBar from "../components/ERP/StatusBar";
import InvoicePrintTemplate from "../components/InvoicePrintTemplate";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

import AppLayout from "../components/layout/AppLayout";





function ERP() {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [currentDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxType, setTaxType] = useState("INTRA STATE");
  const [paymentType, setPaymentType] = useState("CASH");

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");

  // Items in current invoice
  const [items, setItems] = useState([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [medicines, setMedicines] = useState([]);

  // Totals
  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [settings, setSettings] = useState(null);

  // Settings
  

  // Print ref
  const printRef = useRef(null);

  // Load medicines and settings
  useEffect(() => {
  loadMedicines();
}, []);

  // Calculate totals
  useEffect(() => {
  let sub = 0;
  let gst = 0;

  items.forEach((item) => {
    const amount =
      Number(item.qty) * Number(item.rate);

    sub += amount;

    gst +=
      (amount * Number(item.gst || 0)) / 100;
  });

  setSubtotal(sub);
  setGstAmount(gst);
  setGrandTotal(sub + gst);
}, [items]);

  const loadMedicines = async () => {
   const { data, error } =
await supabase
.from("medicines")
.select("*");

console.table(data);

if(error){
 console.error(error);
 return;
}
    setMedicines(data || []);
  };

  

  const addItem = (product) => {
    console.log(product);
    const rate = Number(product.rate || product.mrp || 0);

const newItem = {
  id: Date.now(),
  product: product.medicine_name,
  medicine_id: product.id,
  hsn: product.hsn || "",
  batch: product.batch || "",
  expiry: product.expiry || "",
  qty: 1,
  mrp: Number(product.mrp || 0),
  rate,
  gst: Number(product.gst || 0),
  amount: rate,
};
    setItems([...items, newItem]);
  };

  const updateItem = (index, updates) => {
    const newItems = [...items];
    const item = newItems[index];
    Object.assign(item, updates);
    item.amount = item.qty * item.rate;
    setItems(newItems);
  };

  const deleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
    setCurrentRowIndex(null);
  };

  const saveInvoice = async () => {
    if (items.length === 0) {
      alert("Add at least one item");
      return false;
    }

    const invoiceData = {
      invoice_number: invoiceNumber,
      customer_name: customerName,
      mobile_number: mobileNumber,
      doctor_name: doctorName,
      gst_number: gstNumber,
      address: address,
      tax_type: taxType,
      payment_type: paymentType,
      subtotal: subtotal,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      address: address,
      items: items,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("invoices").insert([invoiceData]);

    if (error) {
      console.error(error);
      alert("Failed to save invoice");
      return false;
    }

    // Update stock
    for (let item of items) {
  const medicine = medicines.find(
    (m) => m.id === item.medicine_id
  );

  if (!medicine) continue;

  const newStock = Math.max(
  0,
  (medicine.stock || 0) - item.qty
);

  await supabase
    .from("medicines")
    .update({
      stock: newStock,
    })
    .eq("id", item.medicine_id);

}

    alert("Invoice saved successfully");
    handleNewInvoice();
    return true;
  };

  const handleNewInvoice = () => {
    setInvoiceNumber(`INV-${Date.now()}`);
    setCustomerName("");
    setMobileNumber("");
    setDoctorName("");
    setGstNumber("");
    setAddress("");
    setItems([]);
    setCurrentRowIndex(null);
    setTaxType("INTRA STATE");
    setPaymentType("CASH");
  };

  const handlePrint = async () => {
    const saved = await saveInvoice();
    if (saved) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  // Keyboard shortcuts
  const shortcuts = {
  F2: () => navigate("/"),
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: () => navigate("/reports"),
  F10: () => navigate("/settings"),
};

  useKeyboardShortcuts(shortcuts);

  return (
    <AppLayout>
     

      <div className="erp-main">
        <LeftPanel
          customerName={customerName}
          setCustomerName={setCustomerName}
          mobileNumber={mobileNumber}
          setMobileNumber={setMobileNumber}
          doctorName={doctorName}
          setDoctorName={setDoctorName}
          gstNumber={gstNumber}
          setGstNumber={setGstNumber}
          address={address}
          setAddress={setAddress}
        />

        <CenterGrid
          medicines={medicines}
          items={items}
          onAddItem={addItem}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          currentRowIndex={currentRowIndex}
          setCurrentRowIndex={setCurrentRowIndex}
        />

        <RightPanel
          invoiceNumber={invoiceNumber}
          setInvoiceNumber={setInvoiceNumber}
          currentDate={currentDate}
          taxType={taxType}
          setTaxType={setTaxType}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
        />
      </div>

      <StatusBar
        itemCount={items.length}
        subtotal={subtotal}
        gstAmount={gstAmount}
        grandTotal={grandTotal}
      />

      <div className="erp-footer">
        <button onClick={handleNewInvoice} className="shortcut-btn">
          F2: New Invoice
        </button>
        <button onClick={() => alert("F3: Search")} className="shortcut-btn">
          F3: Search
        </button>
        <button onClick={saveInvoice} className="shortcut-btn">
          F4: Save
        </button>
        <button onClick={() => navigate("/customers")} className="shortcut-btn">
          F6: Customers
        </button>
        <button onClick={() => navigate("/history")} className="shortcut-btn">
          F7: History
        </button>
        <button onClick={() => navigate("/items")} className="shortcut-btn">
          F8: Items
        </button>
        <button onClick={handlePrint} className="shortcut-btn">
          F9: Print
        </button>
        <button onClick={() => navigate("/settings")} className="shortcut-btn">
          F10: Settings
        </button>
      </div>

      {/* Hidden print template */}
      <div style={{ display: "none" }}>
        <InvoicePrintTemplate
          ref={printRef}
          invoice={{
            invoice_number: invoiceNumber,
            customer_name: customerName,
            mobile_number: mobileNumber,
            doctor_name: doctorName,
            gst_number: gstNumber,
            address: address,
            tax_type: taxType,
            items: items,
            subtotal: subtotal,
            gst_amount: gstAmount,
            grand_total: grandTotal,
          }}
          
        />
      </div>
    </AppLayout>
  );
}

export default ERP;
