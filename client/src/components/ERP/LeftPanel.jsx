
import TypeaheadInput from "../common/TypeaheadInput";

function LeftPanel({
  customerName,
  setCustomerName,
  mobileNumber,
  setMobileNumber,
  doctorReg,
  setDoctorReg,
  gstNumber,
  setGstNumber,
  dlNo,
  setDlNo,
  address,
  setAddress,
  customerSuggestions = [],
  onCustomerSelect,
}) {
  return (
    <div className="left-panel">
      <h3>CUSTOMER DETAILS</h3>

      <div className="form-group">
        <label>Customer Name</label>
        <TypeaheadInput
          value={customerName}
          onChange={setCustomerName}
          suggestions={customerSuggestions}
          onSelect={onCustomerSelect}
          placeholder="Type to search (a-z)..."
        />
      </div>

      <div className="form-group">
        <label>Mobile</label>
        <input
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          placeholder="Mobile number"
        />
      </div>

      <div className="form-group">
        <label>Doctor Reg</label>
        <input
          value={doctorReg}
          onChange={(e) => setDoctorReg(e.target.value)}
          placeholder="Doctor reg no"
        />
      </div>

      <div className="form-group">
        <label>GST Number</label>
        <input
          value={gstNumber}
          onChange={(e) => setGstNumber(e.target.value)}
          placeholder="GST number"
        />
      </div>

      <div className="form-group">
        <label>DL No</label>
        <input
          value={dlNo}
          onChange={(e) => setDlNo(e.target.value)}
          placeholder="Drug licence no"
        />
      </div>

      <div className="form-group">
        <label>Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Customer address"
          style={{ width: "100%", height: "60px", padding: "4px 6px", borderRadius: 0 }}
        />
      </div>
    </div>
  );
}

export default LeftPanel;
