import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const CATEGORY_MAP = {
  Food: 1,
  Transport: 2,
  Bills: 5,
  Entertainment: 3,
  Health: 6,
  Other: 9,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(1000);
  const [expenses, setExpenses] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [authEmail, setAuthEmail] = useState("demo@expensetracker.com");
  const [authPassword, setAuthPassword] = useState("demo123456");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("demo123456");
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "Food",
    date: new Date().toISOString().slice(0, 10),
  });

  // Initialize auth and fetch data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          await fetchExpenses(session.user.id);
        }
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Fetch expenses from Supabase
  const fetchExpenses = async (userId) => {
    try {
      setSyncing(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw error;

      const transformed = data.map((exp) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        category:
          Object.keys(CATEGORY_MAP).find(
            (key) => CATEGORY_MAP[key] === exp.category_id,
          ) || "Other",
        date: exp.date,
      }));

      setExpenses(transformed);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) throw error;

      setUser(data.user);
      await fetchExpenses(data.user.id);
    } catch (error) {
      console.error("Login error:", error);
      window.alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();

    if (authPassword !== authConfirmPassword) {
      window.alert("Passwords do not match");
      return;
    }

    if (authPassword.length < 6) {
      window.alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Automatically sign in after signup
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });

        if (signInError) throw signInError;

        setUser(signInData.user);
        await fetchExpenses(signInData.user.id);
        window.alert(
          "Account created successfully! Welcome to Expense Tracker.",
        );
      }
    } catch (error) {
      console.error("Signup error:", error);
      window.alert("Signup failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setExpenses([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Handle add expense
  const handleSubmit = async (event) => {
    event.preventDefault();
    const description = form.description.trim();
    const amount = Number(form.amount);

    if (!description || !amount || amount <= 0) {
      window.alert("Please enter a valid description and amount.");
      return;
    }

    if (!user) {
      window.alert("Please login first");
      return;
    }

    try {
      setSyncing(true);
      const { data, error } = await supabase
        .from("expenses")
        .insert([
          {
            user_id: user.id,
            category_id: CATEGORY_MAP[form.category] || 9,
            amount: amount,
            description: description,
            date: form.date,
            payment_method: "cash",
            notes: "",
          },
        ])
        .select();

      if (error) throw error;

      setExpenses((current) => [
        {
          id: data[0].id,
          description: data[0].description,
          amount: data[0].amount,
          category: form.category,
          date: data[0].date,
        },
        ...current,
      ]);

      setForm({
        description: "",
        amount: "",
        category: "Food",
        date: new Date().toISOString().slice(0, 10),
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      window.alert("Failed to add expense: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle delete expense
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;

    try {
      setSyncing(true);
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;

      setExpenses((current) => current.filter((exp) => exp.id !== id));
    } catch (error) {
      console.error("Error deleting expense:", error);
      window.alert("Failed to delete expense: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Calculate totals
  const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const remaining = budget - totalSpent;

  // Show loading
  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty-state" style={{ marginTop: "100px" }}>
          ⏳ Loading...
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="app-shell">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Personal Finance</p>
            <h1>Expense Tracker</h1>
            <p className="subtitle">
              {isSignup
                ? "Create your account"
                : "Login to manage your expenses."}
            </p>
          </div>
          <div className="hero-badge">Supabase + React</div>
        </header>

        <section
          className="panel"
          style={{ maxWidth: "500px", margin: "40px auto" }}
        >
          <h2 style={{ marginBottom: "20px" }}>
            {isSignup ? "Sign Up" : "Login"}
          </h2>
          <form onSubmit={isSignup ? handleSignup : handleLogin}>
            <label>
              Email
              <input
                type="email"
                placeholder="your@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="At least 6 characters"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </label>
            {isSignup && (
              <label>
                Confirm Password
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  required
                />
              </label>
            )}
            <button
              type="submit"
              style={{ marginTop: "10px" }}
              disabled={loading}
            >
              {loading
                ? isSignup
                  ? "Creating account..."
                  : "Logging in..."
                : isSignup
                  ? "✨ Sign Up"
                  : "🔐 Login"}
            </button>
          </form>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p
              style={{
                color: "var(--muted)",
                marginBottom: "10px",
                fontSize: "0.9rem",
              }}
            >
              {isSignup ? "Already have an account?" : "Don't have an account?"}
            </p>
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setAuthEmail("");
                setAuthPassword("");
                setAuthConfirmPassword("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-2)",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "0.95rem",
                fontWeight: "600",
              }}
            >
              {isSignup ? "Login here" : "Sign up here"}
            </button>
          </div>

          {!isSignup && (
            <p
              style={{
                textAlign: "center",
                color: "var(--muted)",
                marginTop: "20px",
                fontSize: "0.9rem",
                borderTop: "1px solid var(--border)",
                paddingTop: "15px",
              }}
            >
              Demo user: demo@expensetracker.com / demo123456
            </p>
          )}
        </section>
      </div>
    );
  }

  // Show main app when authenticated
  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Personal Finance</p>
          <h1>Expense Tracker</h1>
          <p className="subtitle">
            Keep your monthly spending organized with Supabase.
          </p>
        </div>
        <div
          className="hero-badge"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <span>👤 {user.email}</span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(217, 117, 122, 0.2)",
              color: "#8f4d52",
              border: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="summary-grid" aria-label="Budget summary">
        <article className="summary-card accent-purple">
          <span>Total spent</span>
          <strong>{formatCurrency(totalSpent)}</strong>
        </article>
        <article className="summary-card accent-blue">
          <span>Remaining budget</span>
          <strong>{formatCurrency(remaining)}</strong>
        </article>
        <article className="summary-card accent-blue">
          <span>Transactions</span>
          <strong>{expenses.length}</strong>
        </article>
      </section>

      <main className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2></h2>
            <label className="budget-control" htmlFor="budget-input">
              <span>Monthly budget</span>
              <input
                id="budget-input"
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value) || 0)}
                disabled={syncing}
              />
            </label>
          </div>

          <form className="expense-form" onSubmit={handleSubmit}>
            <label>
              Description
              <input
                type="text"
                placeholder="Coffee, rent, groceries..."
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                disabled={syncing}
                required
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
                disabled={syncing}
                required
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                disabled={syncing}
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Bills">Bills</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                disabled={syncing}
                required
              />
            </label>
            <button type="submit" disabled={syncing}>
              {syncing ? "⏳ Saving..." : "🐾 Add"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Recent expenses</h2>
            {syncing && (
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                🔄 Syncing...
              </span>
            )}
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state">
              No expenses yet. Add your first one above.
            </div>
          ) : (
            <ul className="expense-list">
              {expenses.map((expense) => (
                <li className="expense-item" key={expense.id}>
                  <div className="expense-meta">
                    <strong>{expense.description}</strong>
                    <span>
                      {expense.category} • {expense.date}
                    </span>
                  </div>
                  <div className="expense-actions">
                    <span className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </span>
                    <button
                      className="delete-btn"
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                      disabled={syncing}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
