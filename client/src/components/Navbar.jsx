import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2>JAPS Healthcare</h2>
        </div>

        <ul className="navbar-menu">
          <li>
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
            >
              Billing
            </Link>
          </li>
          <li>
            <Link
              to="/history"
              className={`nav-link ${isActive("/history") ? "active" : ""}`}
            >
              Invoice History
            </Link>
          </li>
          <li>
            <Link
              to="/items"
              className={`nav-link ${isActive("/items") ? "active" : ""}`}
            >
              Item Master
            </Link>
          </li>
          <li>
            <Link
              to="/settings"
              className={`nav-link ${isActive("/settings") ? "active" : ""}`}
            >
              Settings
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
