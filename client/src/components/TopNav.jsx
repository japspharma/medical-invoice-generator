import { Link, useLocation } from "react-router-dom";
import "./TopNav.css";
function TopNav() {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Billing" },
    { path: "/purchase", label: "Purchase" },
    { path: "/purchase-history", label: "Purchase History" },
    { path: "/items", label: "Items" },
    { path: "/customers", label: "Customers" },
    { path: "/suppliers", label: "Suppliers" },
    { path: "/history", label: "History" },
    { path: "/reports", label: "Reports" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <div className="top-nav">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={
            location.pathname === item.path
              ? "nav-btn active"
              : "nav-btn"
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export default TopNav;