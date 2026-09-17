import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
  const { session, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Go straight to billing.
  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    const err = await signIn(email, password);
    setBusy(false);

    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Wrong email or password. Try again."
          : err.message
      );
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit} autoComplete="on">
        <div className="login-brand">
          <div className="login-logo">JH</div>
          <h1>JAPS HEALTHCARE</h1>
          <p>Billing &amp; Inventory System</p>
        </div>

        <div className="login-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@japshealthcare.com"
            autoFocus
            autoComplete="username"
            disabled={busy}
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">Password</label>
          <div className="login-password-wrap">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={busy}
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {error && <div className="login-error">⚠ {error}</div>}

        <button className="login-btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </button>

        <div className="login-footer">
          Operator accounts are created in the Supabase dashboard.
        </div>
      </form>
    </div>
  );
}

export default Login;
