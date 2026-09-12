import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";



function App() {
  const [invoiceNumber, setInvoiceNumber] = useState(
  `INV-${Date.now()}`
);

  const [items, setItems] = useState([]);
  

  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] =
  useState(null);

const [invoices, setInvoices] = useState([]);
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
 

const loadInvoices = async () => {
  console.log("Invoice History Clicked");

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("Invoices Data:", data);
  console.log("Invoices Error:", error);

  if (error) {
    alert("Failed to load invoices");
    return;
  }

  setInvoices(data);
  setShowHistory(true);
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
  const filteredInvoices = invoices.filter((invoice) =>
  invoice.customer_name
    ?.toLowerCase()
    .includes(searchTerm.toLowerCase()) ||
  invoice.invoice_number
    ?.toLowerCase()
    .includes(searchTerm.toLowerCase()) ||
  invoice.mobile_number
    ?.includes(searchTerm)
);

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
            <table>
              <thead>
                <tr>
                  <th>Sl</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>MRP</th>
                  <th>GST%</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const amount =
                    item.qty * item.mrp;

                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.product}</td>
                      <td>{item.batch}</td>
                      <td>{item.qty}</td>
                      <td>₹{item.mrp}</td>
                      <td>{item.gst}%</td>
                      <td>
                        ₹{amount.toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            deleteItem(index)
                          }
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="shortcut-bar">
            <button>F2 New Invoice</button>

            <button>
              F3 Search Product
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

        <div className="summary-panel">
          <h3>Invoice Summary</h3>

          <div className="summary-row">
            <span>Sub Total</span>
            <strong>
              ₹{totals.subtotal.toFixed(2)}
            </strong>
          </div>

          <div className="summary-row">
            <span>CGST</span>
            <strong>
              ₹{totals.cgst.toFixed(2)}
            </strong>
          </div>

          <div className="summary-row">
            <span>SGST</span>
            <strong>
              ₹{totals.sgst.toFixed(2)}
            </strong>
          </div>

          <div className="summary-row">
            <span>GST Total</span>
            <strong>
              ₹{totals.gstAmount.toFixed(2)}
            </strong>
          </div>

          <div className="grand-total">
            <span>Grand Total</span>
            <strong>
              ₹{totals.grandTotal.toFixed(2)}
            </strong>
          </div>

          <button
            className="print-btn"
            onClick={handlePrint}
          >
            Print Invoice
          </button>

          <button className="secondary-btn">
            Item Master
          </button>

          <button
  className="secondary-btn"
  onClick={loadInvoices}
>
  Invoice History
</button>
        </div>
      </div>
      {showHistory && (
  <div
    style={{
      background: "white",
      marginTop: "20px",
      padding: "20px",
      borderRadius: "10px",
    }}
  >
    <h2>Invoice History</h2>
    <input
  type="text"
  placeholder="Search Invoice..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={{
    padding: "10px",
    marginBottom: "15px",
    width: "300px",
  }}
/>

    <table>
      <thead>
        <tr>
          <th>Invoice No</th>
          <th>Customer</th>
          <th>Mobile</th>
          <th>Total</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {filteredInvoices.map((invoice) => (
          <tr key={invoice.id}>
            <td>{invoice.invoice_number}</td>
            <td>{invoice.customer_name}</td>
            <td>{invoice.mobile_number}</td>
            <td>₹{invoice.grand_total}</td>
            <td>
              {new Date(
                invoice.created_at
              ).toLocaleDateString()}
            </td>
  <td>
  <button
    onClick={() =>
      setSelectedInvoice(invoice)
    }
  >
    View
  </button>
</td>
            
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
{selectedInvoice && (
  <div
    style={{
      background: "white",
      padding: "20px",
      marginTop: "20px",
      borderRadius: "10px",
    }}
  >
    <h2>Invoice Details</h2>

    <p>
      <strong>Invoice No:</strong>{" "}
      {selectedInvoice.invoice_number}
    </p>

    <p>
      <strong>Customer:</strong>{" "}
      {selectedInvoice.customer_name}
    </p>

    <p>
      <strong>Mobile:</strong>{" "}
      {selectedInvoice.mobile_number}
    </p>

    <p>
      <strong>Doctor:</strong>{" "}
      {selectedInvoice.doctor_name}
    </p>

    <p>
      <strong>Total:</strong> ₹
      {selectedInvoice.grand_total}
    </p>

    <h3>Items</h3>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>MRP</th>
        </tr>
      </thead>

      <tbody>
        {selectedInvoice.items?.map(
          (item, index) => (
            <tr key={index}>
              <td>{item.product}</td>
              <td>{item.qty}</td>
              <td>₹{item.mrp}</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  </div>
)}
    </div>
  );
}

export default App;