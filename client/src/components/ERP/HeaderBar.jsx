import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

function HeaderBar() {
  const { user, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-IN")
  );

  const [currentDate] = useState(
    new Date().toLocaleDateString("en-IN")
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN")
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="header-bar">
      <div className="header-company">
        JAPS HEALTHCARE
      </div>

      <div className="header-info">
        <div>
          <label>GST:</label>
          <span>33ANBPV8835E2ZT</span>
        </div>
      </div>

      <div className="header-time">
        <div>
          <label>Date:</label>
          <span>{currentDate}</span>
        </div>        <div>
          <label>Time:</label>
          <span>{currentTime}</span>
        </div>

        {user && (
          <div className="header-user">
            <span className="header-user-email" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              className="header-logout"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HeaderBar;
