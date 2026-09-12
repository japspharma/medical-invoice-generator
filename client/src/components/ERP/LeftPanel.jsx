import React from "react";

function LeftPanel({
  customerName,
  setCustomerName,
  mobileNumber,
  setMobileNumber,
  doctorName,
  setDoctorName,
  gstNumber,
  setGstNumber,
  address,
  setAddress,
}) {
  return (
    <div className="left-panel">
      <h3>CUSTOMER DETAILS</h3>

      <div className="form-group">
        <label>Customer Name</label>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
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
        <label>Doctor</label>
        <input
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Doctor name"
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
