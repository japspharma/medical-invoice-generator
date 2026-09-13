import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import ERP from "./pages/ERP";
import InvoiceHistory from "./pages/InvoiceHistory";
import InvoiceDetails from "./pages/InvoiceDetails";
import ItemMaster from "./pages/ItemMaster";
import CustomerMaster from "./pages/CustomerMaster";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  return (
    <Router>
      
     
      <Routes>
        <Route path="/" element={<ERP />} />
        <Route path="/history" element={<InvoiceHistory />} />
        <Route path="/history/:id" element={<InvoiceDetails />} />
        <Route path="/items" element={<ItemMaster />} />
        <Route path="/customers" element={<CustomerMaster />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
