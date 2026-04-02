import { useEffect, useMemo, useState } from 'react'
import './App.css'

const budgetLimits = {
  Housing: 1400,
  Groceries: 550,
  Transport: 220,
  Utilities: 260,
  Fun: 300,
}

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

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  let payload = {}
  try {
    payload = await response.json()
  } catch {
    payload = {}
  }

  if (!response.ok) {
    const message = payload.error || 'Request failed.'
    throw new Error(message)
  }

  return payload
}

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    displayName: '',
    email: '',
    password: '',
  })
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)
  const [notice, setNotice] = useState('')

  const loadTransactions = async () => {
    const data = await apiRequest('/api/transactions')
    setTransactions(data.transactions ?? [])
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await apiRequest('/api/auth/me')
        setUser(me.user)
        await loadTransactions()
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
  }, [])

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

  const handleAuthFieldChange = (event) => {
    const { name, value } = event.target
    setAuthForm((previous) => ({ ...previous, [name]: value }))
  }

  const resetAuthForm = () => {
    setAuthForm({
      displayName: '',
      email: '',
      password: '',
    })
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setNotice('')
    setIsSubmittingAuth(true)

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const payload = {
        email: authForm.email,
        password: authForm.password,
      }

      if (authMode === 'register') {
        payload.displayName = authForm.displayName
      }

      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setUser(data.user)
      resetAuthForm()
      await loadTransactions()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const handleLogout = async () => {
    setNotice('')
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      })
    } finally {
      setUser(null)
      setTransactions([])
    }
  }

  const handleAddTransaction = async (event) => {
    event.preventDefault()
    setNotice('')

    if (!form.label.trim()) {
      setNotice('Please add a transaction description.')
      return
    }

    const numericAmount = Number(form.amount)
    if (!numericAmount || numericAmount <= 0) {
      setNotice('Please enter a valid amount.')
      return
    }

    setIsSubmittingTransaction(true)

    try {
      const data = await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          label: form.label.trim(),
          amount: numericAmount,
          category: form.category.trim() || 'General',
          date: form.date,
        }),
      })

      setTransactions((previous) => [data.transaction, ...previous])
      setForm((previous) => ({ ...defaultForm, type: previous.type }))
    } catch (error) {
      setNotice(error.message)
    } finally {
      setIsSubmittingTransaction(false)
    }
  }

  const handleDeleteTransaction = async (transactionId) => {
    setNotice('')
    try {
      await apiRequest(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      })
      setTransactions((previous) => previous.filter((item) => item.id !== transactionId))
    } catch (error) {
      setNotice(error.message)
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <h1>Loading your secure workspace...</h1>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="app-shell auth-shell">
        <section className="hero-panel">
          <p className="eyebrow">Private by Design</p>
          <div className="hero-heading">
            <h1>Track money privately with your own account</h1>
            <p>
              Create a secure login, then every income and expense entry is saved to your private
              Cloudflare D1 database records.
            </p>
          </div>
        </section>

        <section className="panel auth-panel">
          <header className="auth-header">
            <h2>{authMode === 'login' ? 'Sign in' : 'Create account'}</h2>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setNotice('')
                setAuthMode((previous) => (previous === 'login' ? 'register' : 'login'))
              }}
            >
              {authMode === 'login' ? 'Need an account?' : 'Already registered?'}
            </button>
          </header>

          <form className="transaction-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <label>
                Display Name
                <input
                  name="displayName"
                  value={authForm.displayName}
                  onChange={handleAuthFieldChange}
                  placeholder="Tom"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={handleAuthFieldChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthFieldChange}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </label>

            <button type="submit" disabled={isSubmittingAuth}>
              {isSubmittingAuth ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {notice && <p className="notice">{notice}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Monthly Planner</p>
        <div className="hero-heading">
          <h1>Income, Expense, and Budget Tracker</h1>
          <p>
            Welcome back, {user.displayName}. Your entries are private and tied to your account.
          </p>
        </div>
        <div className="toolbar">
          <span className="user-pill">{user.email}</span>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Log out
          </button>
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

            <button type="submit" disabled={isSubmittingTransaction}>
              {isSubmittingTransaction ? 'Saving...' : 'Add Entry'}
            </button>
          </form>
          {notice && <p className="notice">{notice}</p>}
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
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDeleteTransaction(item.id)}
                  aria-label={`Delete ${item.label}`}
                >
                  Remove
                </button>
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
