import { useMemo, useState } from 'react'
import './App.css'

const budgetLimits = {
  Housing: 1400,
  Groceries: 550,
  Transport: 220,
  Utilities: 260,
  Fun: 300,
}

const initialTransactions = [
  {
    id: 1,
    type: 'income',
    label: 'Salary',
    amount: 4200,
    category: 'Paycheck',
    date: '2026-04-01',
  },
  {
    id: 2,
    type: 'expense',
    label: 'Apartment Rent',
    amount: 1300,
    category: 'Housing',
    date: '2026-04-02',
  },
  {
    id: 3,
    type: 'expense',
    label: 'Groceries',
    amount: 126,
    category: 'Groceries',
    date: '2026-04-03',
  },
  {
    id: 4,
    type: 'expense',
    label: 'Internet + Power',
    amount: 172,
    category: 'Utilities',
    date: '2026-04-04',
  },
  {
    id: 5,
    type: 'income',
    label: 'Freelance Design',
    amount: 620,
    category: 'Side Gig',
    date: '2026-04-07',
  },
]

const defaultForm = {
  type: 'expense',
  label: '',
  amount: '',
  category: 'Groceries',
  date: new Date().toISOString().slice(0, 10),
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function App() {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [form, setForm] = useState(defaultForm)

  const { income, expenses, balance, savingsRate, spentByCategory, recentItems } =
    useMemo(() => {
      const incomeTotal = transactions
        .filter((item) => item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0)

      const expenseTotal = transactions
        .filter((item) => item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0)

      const spendingByCategory = transactions
        .filter((item) => item.type === 'expense')
        .reduce((acc, item) => {
          const current = acc[item.category] ?? 0
          acc[item.category] = current + item.amount
          return acc
        }, {})

      const sortedRecent = [...transactions].sort((a, b) => {
        const byDate = new Date(b.date).getTime() - new Date(a.date).getTime()
        return byDate !== 0 ? byDate : b.id - a.id
      })

      return {
        income: incomeTotal,
        expenses: expenseTotal,
        balance: incomeTotal - expenseTotal,
        savingsRate: incomeTotal > 0 ? ((incomeTotal - expenseTotal) / incomeTotal) * 100 : 0,
        spentByCategory: spendingByCategory,
        recentItems: sortedRecent.slice(0, 7),
      }
    }, [transactions])

  const budgetCards = useMemo(
    () =>
      Object.entries(budgetLimits).map(([category, limit]) => {
        const spent = spentByCategory[category] ?? 0
        const remaining = limit - spent
        const usage = Math.min((spent / limit) * 100, 100)
        return {
          category,
          limit,
          spent,
          remaining,
          usage,
          exceeded: spent > limit,
        }
      }),
    [spentByCategory],
  )

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleAddTransaction = (event) => {
    event.preventDefault()

    if (!form.label.trim()) {
      return
    }

    const numericAmount = Number(form.amount)
    if (!numericAmount || numericAmount <= 0) {
      return
    }

    const transaction = {
      id: Date.now(),
      type: form.type,
      label: form.label.trim(),
      amount: numericAmount,
      category: form.category.trim() || 'General',
      date: form.date,
    }

    setTransactions((previous) => [transaction, ...previous])
    setForm((previous) => ({ ...defaultForm, type: previous.type }))
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Monthly Planner</p>
        <div className="hero-heading">
          <h1>Income, Expense, and Budget Tracker</h1>
          <p>Track cash flow, monitor spending habits, and keep every budget category on target.</p>
        </div>
        <div className="stats-grid" aria-label="Financial summary">
          <article className="stat-card">
            <h2>Total Income</h2>
            <p>{currency.format(income)}</p>
          </article>
          <article className="stat-card">
            <h2>Total Expenses</h2>
            <p>{currency.format(expenses)}</p>
          </article>
          <article className="stat-card emphasis">
            <h2>Current Balance</h2>
            <p>{currency.format(balance)}</p>
          </article>
          <article className="stat-card">
            <h2>Savings Rate</h2>
            <p>{savingsRate.toFixed(1)}%</p>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <header>
            <h2>Add Transaction</h2>
          </header>
          <form className="transaction-form" onSubmit={handleAddTransaction}>
            <label>
              Type
              <select name="type" value={form.type} onChange={handleFieldChange}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              Description
              <input
                name="label"
                value={form.label}
                onChange={handleFieldChange}
                placeholder="Coffee, Salary, Rent"
                required
              />
            </label>

            <label>
              Amount
              <input
                type="number"
                min="1"
                name="amount"
                value={form.amount}
                onChange={handleFieldChange}
                placeholder="0"
                required
              />
            </label>

            <label>
              Category
              <input
                name="category"
                value={form.category}
                onChange={handleFieldChange}
                placeholder="Groceries"
                required
              />
            </label>

            <label>
              Date
              <input type="date" name="date" value={form.date} onChange={handleFieldChange} required />
            </label>

            <button type="submit">Add Entry</button>
          </form>
        </article>

        <article className="panel">
          <header>
            <h2>Recent Activity</h2>
          </header>
          <ul className="activity-list">
            {recentItems.map((item) => (
              <li key={item.id} className={item.type === 'income' ? 'income' : 'expense'}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.category}</span>
                </div>
                <div>
                  <strong>{item.type === 'income' ? '+' : '-'}{currency.format(item.amount)}</strong>
                  <span>{item.date}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="budget-panel panel">
        <header>
          <h2>Budget Dashboard</h2>
        </header>
        <div className="budget-grid">
          {budgetCards.map((budget) => (
            <article key={budget.category} className="budget-card">
              <h3>{budget.category}</h3>
              <div className="budget-row">
                <span>Spent</span>
                <strong>{currency.format(budget.spent)}</strong>
              </div>
              <div className="budget-row">
                <span>Limit</span>
                <strong>{currency.format(budget.limit)}</strong>
              </div>
              <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budget.usage)}>
                <div style={{ width: `${budget.usage}%` }} />
              </div>
              <p className={budget.exceeded ? 'alert' : ''}>
                {budget.exceeded
                  ? `${currency.format(Math.abs(budget.remaining))} over budget`
                  : `${currency.format(budget.remaining)} remaining`}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
