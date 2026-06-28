import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'expense-tracker-react-state';

const defaultState = {
  budget: 1000,
  expenses: []
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;
    const parsed = JSON.parse(saved);
    return {
      budget: Number(parsed.budget) || defaultState.budget,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : []
    };
  } catch (error) {
    console.error('Unable to load expenses', error);
    return defaultState;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

export default function App() {
  const [budget, setBudget] = useState(() => loadState().budget);
  const [expenses, setExpenses] = useState(() => loadState().expenses);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budget, expenses }));
  }, [budget, expenses]);

  const totals = useMemo(() => {
    const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    return {
      totalSpent,
      remaining: budget - totalSpent
    };
  }, [budget, expenses]);

  function handleSubmit(event) {
    event.preventDefault();
    const description = form.description.trim();
    const amount = Number(form.amount);

    if (!description || !amount || amount <= 0) {
      window.alert('Please enter a valid description and amount.');
      return;
    }

    setExpenses((current) => [
      {
        id: crypto.randomUUID(),
        description,
        amount,
        category: form.category,
        date: form.date || new Date().toISOString().slice(0, 10)
      },
      ...current
    ]);

    setForm({
      description: '',
      amount: '',
      category: 'Food',
      date: new Date().toISOString().slice(0, 10)
    });
  }

  function handleDelete(id) {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Personal Finance</p>
          <h1>Expense Tracker</h1>
          <p className="subtitle">Keep your monthly spending organized in a modern React app.</p>
        </div>
        <div className="hero-badge">React + Vite</div>
      </header>

      <section className="summary-grid" aria-label="Budget summary">
        <article className="summary-card accent-purple">
          <span>Total spent</span>
          <strong>{formatCurrency(totals.totalSpent)}</strong>
        </article>
        <article className="summary-card accent-blue">
          <span>Remaining budget</span>
          <strong>{formatCurrency(totals.remaining)}</strong>
        </article>
        <article className="summary-card accent-green">
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
                onChange={(event) => setForm({ ...form, description: event.target.value })}
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
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                required
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
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
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </label>
            <button type="submit">🐾 Add</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Recent expenses</h2>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state">No expenses yet. Add your first one above.</div>
          ) : (
            <ul className="expense-list">
              {expenses
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((expense) => (
                  <li className="expense-item" key={expense.id}>
                    <div className="expense-meta">
                      <strong>{expense.description}</strong>
                      <span>{expense.category} • {expense.date}</span>
                    </div>
                    <div className="expense-actions">
                      <span className="expense-amount">{formatCurrency(expense.amount)}</span>
                      <button className="delete-btn" type="button" onClick={() => handleDelete(expense.id)}>
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
