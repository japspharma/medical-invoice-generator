import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import InvoiceTable from "../components/InvoiceTable";
import SummaryPanel from "../components/SummaryPanel";
import "./Billing.css";

function Billing() {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`
  );

  const [items, setItems] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [taxType, setTaxType] = useState("INTRA STATE");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [batch, setBatch] = useState("");
  const [qty, setQty] = useState("");
  const [mrp, setMrp] = useState("");
  const [gst, setGst] = useState("");

  const handleMedicineChange = (value) => {
    setSelectedMedicine(value);

    const medicine = medicines.find(
      (item) => item.medicine_name === value
    );

    if (medicine) {
      setBatch(medicine.batch);
      setMrp(medicine.mrp);
      setGst(medicine.gst);
    }
  };

  const addItem = () => {
    if (!selectedMedicine || !qty) return;

    const newItem = {
      product: selectedMedicine,
      batch,
      qty: Number(qty),
      mrp: Number(mrp),
      gst: Number(gst),
    };

    setItems((prev) => [...prev, newItem]);

    setSelectedMedicine("");
    setBatch("");
    setQty("");
    setMrp("");
    setGst("");
  };

  const deleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let gstAmount = 0;

    items.forEach((item) => {
      const amount = item.qty * item.mrp;

      subtotal += amount;
      gstAmount += (amount * item.gst) / 100;
    });

    return {
      subtotal,
      gstAmount,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      grandTotal: subtotal + gstAmount,
    };
  }, [items]);

  const saveInvoice = async () => {
    console.log("Saving invoice...");
    if (items.length === 0) {
      alert("Add at least one item");
      return false;
    }
    console.log("Before Supabase Insert");
    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          invoice_number: invoiceNumber,
          customer_name: customerName,
          mobile_number: mobileNumber,
          doctor_name: doctorName,
          tax_type: taxType,
          subtotal: totals.subtotal,
          gst_amount: totals.gstAmount,
          grand_total: totals.grandTotal,
          items: items,
        },
      ]);
    console.log("After Supabase Insert");
    console.log("Supabase Error:", error);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    console.table(data);

    if (error) {
      console.error(error);
      alert("Failed to save invoice");
      return false;
    }

    alert("Invoice Saved Successfully");

    setItems([]);
    setCustomerName("");
    setMobileNumber("");
    setDoctorName("");
    setSelectedMedicine("");
    setBatch("");
    setQty("");
    setMrp("");
    setGst("");
    setInvoiceNumber(`INV-${Date.now()}`);

    return true;
  };

  const loadMedicines = async () => {
    const { data, error } = await supabase
      .from("medicines")
      .select("*");

    console.log("Medicines Data:", data);
    console.table(data);
    console.log("Medicines Error:", error);

    setMedicines(data || []);
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const handlePrint = async () => {
    const saved = await saveInvoice();

    if (saved) {
      window.print();
    }
  };

  const handleNewInvoice = () => {
    setItems([]);
    setCustomerName("");
    setMobileNumber("");
    setDoctorName("");
    setSelectedMedicine("");
    setBatch("");
    setQty("");
    setMrp("");
    setGst("");
    setInvoiceNumber(`INV-${Date.now()}`);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="company-info">
          <h1>JAPS HEALTHCARE</h1>
          <p>No.3, Thiruveethiamman Koil Street</p>
          <p>Koyambedu, Chennai - 600107</p>
          <p>GSTIN : 33ANBPV8835E2ZT</p>
        </div>

        <div className="header-right">
          <div className="field-group">
            <label>Invoice No</label>
            <input value={invoiceNumber} readOnly />
          </div>

          <div className="field-group">
            <label>Date</label>
            <input
              value={new Date().toLocaleDateString("en-GB")}
              readOnly
            />
          </div>

          <div className="field-group">
            <label>Tax Type</label>
            <select
              value={taxType}
              onChange={(e) =>
                setTaxType(e.target.value)
              }
            >
              <option>INTRA STATE</option>
              <option>INTER STATE</option>
            </select>
          </div>
        </div>
      </header>

      <section className="customer-section">
        <div className="field-group">
          <label>Customer Name</label>
          <input
            value={customerName}
            onChange={(e) =>
              setCustomerName(e.target.value)
            }
            placeholder="Customer Name"
          />
        </div>

        <div className="field-group">
          <label>Mobile Number</label>
          <input
            value={mobileNumber}
            onChange={(e) =>
              setMobileNumber(e.target.value)
            }
            placeholder="Mobile Number"
          />
        </div>

        <div className="field-group">
          <label>Doctor Name</label>
          <input
            value={doctorName}
            onChange={(e) =>
              setDoctorName(e.target.value)
            }
            placeholder="Doctor Name"
          />
        </div>
      </section>

      <section className="medicine-entry">
        <select
          value={selectedMedicine}
          onChange={(e) =>
            handleMedicineChange(e.target.value)
          }
        >
          <option value="">
            Select Medicine
          </option>

          {medicines.map((medicine) => (
            <option
              key={medicine.id}
              value={medicine.medicine_name}
            >
              {medicine.medicine_name}
            </option>
          ))}
        </select>

        <input
          value={batch}
          readOnly
          placeholder="Batch"
        />

        <input
          type="number"
          value={qty}
          onChange={(e) =>
            setQty(e.target.value)
          }
          placeholder="Qty"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addItem();
            }
          }}
        />

        <input
          value={mrp}
          readOnly
          placeholder="MRP"
        />

        <button
          className="add-btn"
          onClick={addItem}
        >
          Add Item
        </button>
      </section>

      <div className="content-layout">
        <div className="billing-area">
          <div className="table-wrapper">
            <InvoiceTable
              items={items}
              showActions={true}
              onViewClick={deleteItem}
            />
          </div>

          <div className="shortcut-bar">
            <button onClick={handleNewInvoice}>
              F2 New Invoice
            </button>

            <button onClick={() => navigate("/items")}>
              F3 Item Master
            </button>

            <button
              onClick={saveInvoice}
            >
              F4 Save
            </button>

            <button
              onClick={handlePrint}
            >
              F9 Print
            </button>
          </div>
        </div>

        <SummaryPanel totals={totals} />
      </div>
    </div>
  );
}

export default Billing;
