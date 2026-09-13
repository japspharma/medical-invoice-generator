import { useState, useEffect, useMemo, useRef } from "react";
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





const createInvoiceNumber = () => `INV-${Date.now()}`;

function ERP() {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState(createInvoiceNumber);
  const [currentDate] = useState(() => new Date().toISOString().split("T")[0]);
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

  const [settings, setSettings] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);
  const savingRef = useRef(false);

  // Settings
  

  // Print ref
  const printRef = useRef(null);

  useEffect(() => {
    const loadBillingData = async () => {
      const [{ data: medicineData, error }, { data: settingsData }] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (error) console.error("Unable to load medicines:", error);
      else setMedicines(medicineData || []);
      setSettings(settingsData);
    };
    loadBillingData();
  }, []);

  const { subtotal, gstAmount, grandTotal } = useMemo(() => {
    const result = items.reduce((totals, item) => {
      const amount = Number(item.qty || 0) * Number(item.rate || 0);
      totals.subtotal += amount;
      totals.gstAmount += (amount * Number(item.gst || 0)) / 100;
      return totals;
    }, { subtotal: 0, gstAmount: 0 });
    return { ...result, grandTotal: result.subtotal + result.gstAmount };
  }, [items]);

  

  const addItem = (product) => {
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
    if (savingRef.current) return false;
    if (items.length === 0) {
      alert("Add at least one item");
      return false;
    }
    if (items.some((item) => Number(item.qty) <= 0)) {
      alert("Each item must have a quantity greater than zero");
      return false;
    }
    const insufficientItem = items.find((item) => {
      const medicine = medicines.find((candidate) => candidate.id === item.medicine_id);
      return medicine && Number(item.qty) > Number(medicine.stock || 0);
    });
    if (insufficientItem) {
      alert(`Insufficient stock for ${insufficientItem.product}`);
      return false;
    }
    savingRef.current = true;

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
      items: items,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("invoices").insert([invoiceData]);

    if (error) {
      console.error(error);
      alert("Failed to save invoice");
      savingRef.current = false;
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

  const { error: stockError } = await supabase
    .from("medicines")
    .update({
      stock: newStock,
    })
    .eq("id", item.medicine_id);

  if (stockError) {
    console.error("Invoice saved but stock update failed:", stockError);
  }

}

    alert("Invoice saved successfully");
    handleNewInvoice();
    savingRef.current = false;
    return invoiceData;
  };

  const handleNewInvoice = () => {
    setInvoiceNumber(createInvoiceNumber());
    setCustomerName("");
    setMobileNumber("");
    setDoctorName("");
    setGstNumber("");
    setAddress("");
    setItems([]);
    setCurrentRowIndex(null);
    setTaxType("INTRA STATE");
    setPaymentType("CASH");
    setPrintInvoice(null);
  };

  const handlePrint = async () => {
    const savedInvoice = await saveInvoice();
    if (savedInvoice) {
      setPrintInvoice(savedInvoice);
      setTimeout(() => {
        window.print();
      }, 0);
    }
  };

  // Keyboard shortcuts
  const shortcuts = {
  F2: handleNewInvoice,
  F3: () => document.querySelector(".grid-product-search input")?.focus(),
  F4: saveInvoice,
  F6: () => navigate("/customers"),
  F7: () => navigate("/history"),
  F8: () => navigate("/items"),
  F9: handlePrint,
  F10: () => navigate("/settings"),
  "Ctrl+N": handleNewInvoice,
  "Ctrl+S": saveInvoice,
  "Ctrl+P": handlePrint,
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

      {/* Print-only invoice */}
      <div className="print-preview-container">
        <InvoicePrintTemplate
          ref={printRef}
          invoice={printInvoice || {
            invoice_number: invoiceNumber,
            created_at: currentDate,
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
          settings={settings}
        />
      </div>
    </AppLayout>
  );
}

export default ERP;
