import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

import "../App.css";

function Billing() {
  const navigate = useNavigate();

  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${Date.now()}`
  );

  const [items, setItems] = useState([]);

  const [medicines, setMedicines] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [taxType, setTaxType] = useState("INTRA STATE");
  const [selectedMedicine, setSelectedMedicine] =
    useState("");
  const [batch, setBatch] = useState("");
  const [qty, setQty] = useState("");
  const [mrp, setMrp] = useState("");
  const [gst, setGst] = useState("");

  doc.save(
    `${selectedInvoice.invoice_number}.pdf`
  );
};
  const [invoiceNumber, setInvoiceNumber] = useState(
  `INV-${Date.now()}`
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
        <td>
          <button
            className="delete-btn"
            onClick={() => deleteItem(index)}
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
  onClick={() => navigate("/history")}
>
  Invoice History
</button>
        </div>
      </div>
      

    </div>
  );
}

export default Billing;