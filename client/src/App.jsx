import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./App.css";

import Login from "./pages/Login";
import ERP from "./pages/ERP";
import Purchase from "./pages/Purchase";
import InvoiceHistory from "./pages/InvoiceHistory";
import InvoiceDetails from "./pages/InvoiceDetails";
import ItemMaster from "./pages/ItemMaster";
import CustomerMaster from "./pages/CustomerMaster";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-boot">
        <div className="auth-boot-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <ERP />
              </RequireAuth>
            }
          />
          <Route
            path="/purchase"
            element={
              <RequireAuth>
                <Purchase />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <InvoiceHistory />
              </RequireAuth>
            }
          />
          <Route
            path="/history/:id"
            element={
              <RequireAuth>
                <InvoiceDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/items"
            element={
              <RequireAuth>
                <ItemMaster />
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <CustomerMaster />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <Reports />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
