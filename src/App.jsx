import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const navItems = [
  'Dashboard',
  'Transactions',
  'Budgets',
  'Bills',
  'Goals',
  'Reports',
  'Security',
  'Settings',
]

const initialTransactions = [
  {
    id: 1,
    type: 'income',
    amount: 4200,
    merchant: 'Acme Corp Payroll',
    category: 'Salary',
    account: 'Checking',
    date: '2026-04-01',
    notes: 'Monthly salary payment',
    tags: ['payday'],
    recurring: true,
  },
  {
    id: 2,
    type: 'income',
    amount: 850,
    merchant: 'Freelance Client',
    category: 'Freelance',
    account: 'Checking',
    date: '2026-04-05',
    notes: 'Landing page project milestone',
    tags: ['client', 'design'],
    recurring: false,
  },
  {
    id: 3,
    type: 'expense',
    amount: 1450,
    merchant: 'City Apartments',
    category: 'Rent',
    account: 'Checking',
    date: '2026-04-02',
    notes: 'April rent',
    tags: ['housing'],
    recurring: true,
  },
  {
    id: 4,
    type: 'expense',
    amount: 245,
    merchant: 'Fresh Market',
    category: 'Groceries',
    account: 'Credit Card',
    date: '2026-04-07',
    notes: 'Weekly groceries',
    tags: ['food'],
    recurring: false,
  },
  {
    id: 5,
    type: 'expense',
    amount: 92,
    merchant: 'Metro Transit',
    category: 'Transport',
    account: 'Checking',
    date: '2026-04-09',
    notes: 'Monthly transit pass',
    tags: ['commute'],
    recurring: true,
  },
  {
    id: 6,
    type: 'expense',
    amount: 64,
    merchant: 'VideoStream+',
    category: 'Subscriptions',
    account: 'Credit Card',
    date: '2026-04-10',
    notes: 'Streaming + cloud storage',
    tags: ['subscription'],
    recurring: true,
  },
  {
    id: 7,
    type: 'expense',
    amount: 178,
    merchant: 'Utility Co',
    category: 'Utilities',
    account: 'Checking',
    date: '2026-04-11',
    notes: 'Electricity and water',
    tags: ['home'],
    recurring: true,
  },
  {
    id: 8,
    type: 'expense',
    amount: 133,
    merchant: 'Bistro House',
    category: 'Dining Out',
    account: 'Credit Card',
    date: '2026-04-13',
    notes: 'Dinner with friends',
    tags: ['social'],
    recurring: false,
  },
  {
    id: 9,
    type: 'expense',
    amount: 120,
    merchant: 'Direct Transfer',
    category: 'Savings',
    account: 'Savings',
    date: '2026-04-14',
    notes: 'Emergency fund top-up',
    tags: ['goal'],
    recurring: true,
  },
]

const initialBudgets = [
  { id: 1, category: 'Rent', budget: 1500, carryOver: false },
  { id: 2, category: 'Groceries', budget: 500, carryOver: true },
  { id: 3, category: 'Transport', budget: 180, carryOver: true },
  { id: 4, category: 'Utilities', budget: 220, carryOver: false },
  { id: 5, category: 'Dining Out', budget: 200, carryOver: true },
  { id: 6, category: 'Subscriptions', budget: 80, carryOver: false },
  { id: 7, category: 'Entertainment', budget: 160, carryOver: true },
]

const initialBills = [
  { id: 1, name: 'Rent', dueDate: '2026-04-30', amount: 1450, frequency: 'Monthly', paid: false, subscription: false },
  { id: 2, name: 'Internet', dueDate: '2026-04-22', amount: 65, frequency: 'Monthly', paid: false, subscription: false },
  { id: 3, name: 'MusicBox', dueDate: '2026-04-20', amount: 11, frequency: 'Monthly', paid: true, subscription: true },
  { id: 4, name: 'VideoStream+', dueDate: '2026-04-21', amount: 19, frequency: 'Monthly', paid: false, subscription: true },
]

const initialGoals = [
  { id: 1, title: 'Emergency Fund', targetAmount: 5000, savedAmount: 2100, targetDate: '2026-12-31' },
  { id: 2, title: 'Vacation Trip', targetAmount: 2400, savedAmount: 920, targetDate: '2026-09-15' },
]

const initialTrend = [
  { month: 'Jan', income: 4600, expense: 3380 },
  { month: 'Feb', income: 4400, expense: 3200 },
  { month: 'Mar', income: 5050, expense: 3610 },
  { month: 'Apr', income: 5200, expense: 2522 },
]

const initialForm = {
  id: null,
  type: 'expense',
  amount: '',
  merchant: '',
  category: 'Groceries',
  account: 'Checking',
  date: '2026-04-15',
  notes: '',
  tags: 'quick-entry',
  recurring: false,
  receiptName: '',
}

const initialFilters = {
  type: 'all',
  category: 'all',
  account: 'all',
  minAmount: '',
  maxAmount: '',
  fromDate: '',
  toDate: '',
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function statusFromUsage(usage) {
  if (usage >= 100) return 'over'
  if (usage >= 85) return 'warn'
  return 'good'
}

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
    throw new Error(payload.error || 'Request failed.')
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
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [stateError, setStateError] = useState('')

  const [activePage, setActivePage] = useState('Dashboard')
  const [theme, setTheme] = useState('light')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [month, setMonth] = useState('2026-04')
  const [accountFilter, setAccountFilter] = useState('All Accounts')
  const [query, setQuery] = useState('')

  const [transactions, setTransactions] = useState(initialTransactions)
  const [budgets, setBudgets] = useState(initialBudgets)
  const [bills, setBills] = useState(initialBills)
  const [goals, setGoals] = useState(initialGoals)
  const [trend] = useState(initialTrend)

  const [transactionFilters, setTransactionFilters] = useState(initialFilters)
  const [transactionForm, setTransactionForm] = useState(initialForm)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [newCategory, setNewCategory] = useState('')
  const [goalContribution, setGoalContribution] = useState({})
  const [reportRange, setReportRange] = useState('6m')

  const [settings, setSettings] = useState({
    currency: 'USD',
    reminders: true,
    alertOverspending: true,
    weeklySummary: true,
  })
  const [auditEvents, setAuditEvents] = useState([])
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')

  const hasHydratedRef = useRef(false)
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const me = await apiRequest('/api/auth/me')
        setUser(me.user)
      } catch {
        setUser(null)
        hasHydratedRef.current = true
        setIsAuthLoading(false)
        return
      }

      try {
        const stateResult = await apiRequest('/api/state')
        const state = stateResult.state ?? {}

        if (Array.isArray(state.transactions)) setTransactions(state.transactions)
        if (Array.isArray(state.budgets)) setBudgets(state.budgets)
        if (Array.isArray(state.bills)) setBills(state.bills)
        if (Array.isArray(state.goals)) setGoals(state.goals)
        if (state.settings && typeof state.settings === 'object') {
          setSettings((previous) => ({ ...previous, ...state.settings }))
        }
        if (state.ui && typeof state.ui === 'object') {
          if (typeof state.ui.theme === 'string') setTheme(state.ui.theme)
          if (typeof state.ui.month === 'string') setMonth(state.ui.month)
          if (typeof state.ui.accountFilter === 'string') setAccountFilter(state.ui.accountFilter)
          if (typeof state.ui.activePage === 'string') setActivePage(state.ui.activePage)
        }
        setStateError('')
      } catch (error) {
        setStateError(error.message)
        setSaveStatus('State unavailable')
      } finally {
        hasHydratedRef.current = true
        setIsAuthLoading(false)
      }
    }

    loadSession()

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!user || !hasHydratedRef.current) {
      return
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setSaveStatus('Saving...')

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiRequest('/api/state', {
          method: 'PUT',
          body: JSON.stringify({
            transactions,
            budgets,
            bills,
            goals,
            settings,
            ui: {
              theme,
              month,
              accountFilter,
              activePage,
            },
          }),
        })
        setSaveStatus('Saved')
      } catch {
        setSaveStatus('Save failed')
      }
    }, 700)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [user, transactions, budgets, bills, goals, settings, theme, month, accountFilter, activePage])

  const loadAuditEvents = useCallback(async () => {
    if (!user) {
      return
    }

    setIsAuditLoading(true)
    setAuditError('')

    try {
      const result = await apiRequest('/api/audit', {
        headers: {
          'x-audit-limit': '80',
        },
      })
      setAuditEvents(Array.isArray(result.events) ? result.events : [])
    } catch (error) {
      setAuditError(error.message)
    } finally {
      setIsAuditLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (activePage === 'Security' && user) {
      loadAuditEvents()
    }
  }, [activePage, user, loadAuditEvents])

  const categories = useMemo(() => {
    const fromTransactions = transactions.map((item) => item.category)
    const fromBudgets = budgets.map((item) => item.category)
    return [...new Set([...fromTransactions, ...fromBudgets])].sort()
  }, [transactions, budgets])

  const accounts = useMemo(() => [...new Set(transactions.map((item) => item.account))], [transactions])

  const filteredTransactions = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    return transactions.filter((item) => {
      const matchesSearch =
        !lowerQuery ||
        item.merchant.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        item.notes.toLowerCase().includes(lowerQuery) ||
        item.tags.join(' ').toLowerCase().includes(lowerQuery)

      const matchesType = transactionFilters.type === 'all' || item.type === transactionFilters.type
      const matchesCategory =
        transactionFilters.category === 'all' || item.category === transactionFilters.category
      const matchesAccount =
        transactionFilters.account === 'all' || item.account === transactionFilters.account

      const min = Number(transactionFilters.minAmount)
      const max = Number(transactionFilters.maxAmount)
      const matchesMin = !min || item.amount >= min
      const matchesMax = !max || item.amount <= max

      const matchesFrom = !transactionFilters.fromDate || item.date >= transactionFilters.fromDate
      const matchesTo = !transactionFilters.toDate || item.date <= transactionFilters.toDate

      const globalAccountOk =
        accountFilter === 'All Accounts' || item.account === accountFilter

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesAccount &&
        matchesMin &&
        matchesMax &&
        matchesFrom &&
        matchesTo &&
        globalAccountOk
      )
    })
  }, [transactions, query, transactionFilters, accountFilter])

  const { income, expenses, balance, safeToSpend, spentByCategory, recentItems } =
    useMemo(() => {
      const baseSet = filteredTransactions
      const incomeTotal = baseSet
        .filter((item) => item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0)

      const expenseTotal = baseSet
        .filter((item) => item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0)

      const spendingByCategory = baseSet
        .filter((item) => item.type === 'expense')
        .reduce((acc, item) => {
          const current = acc[item.category] ?? 0
          acc[item.category] = current + item.amount
          return acc
        }, {})

      const sortedRecent = [...baseSet].sort((a, b) => {
        const byDate = new Date(b.date).getTime() - new Date(a.date).getTime()
        return byDate !== 0 ? byDate : b.id - a.id
      })

      const remainingBudget = budgets.reduce((sum, budget) => {
        const spent = spendingByCategory[budget.category] ?? 0
        return sum + Math.max(budget.budget - spent, 0)
      }, 0)

      return {
        income: incomeTotal,
        expenses: expenseTotal,
        balance: incomeTotal - expenseTotal,
        safeToSpend: Math.min(Math.max(incomeTotal - expenseTotal, 0), remainingBudget),
        spentByCategory: spendingByCategory,
        recentItems: sortedRecent.slice(0, 7),
      }
    }, [filteredTransactions, budgets])

  const budgetCards = useMemo(
    () =>
      budgets.map((item) => {
        const spent = spentByCategory[item.category] ?? 0
        const remaining = item.budget - spent
        const usage = item.budget > 0 ? (spent / item.budget) * 100 : 0
        return {
          ...item,
          spent,
          remaining,
          usage: Math.min(usage, 120),
          status: statusFromUsage(usage),
        }
      }),
    [budgets, spentByCategory],
  )

  const upcomingBills = useMemo(
    () =>
      [...bills]
        .filter((bill) => !bill.paid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 4),
    [bills],
  )

  const smartInsights = useMemo(() => {
    const alerts = []
    budgetCards.forEach((card) => {
      if (card.status === 'over') {
        alerts.push(`${card.category} is over budget by ${currency.format(Math.abs(card.remaining))}.`)
      } else if (card.status === 'warn') {
        alerts.push(`${card.category} is at ${Math.round(card.usage)}% of monthly budget.`)
      }
    })

    const unpaidTotal = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0)
    if (unpaidTotal > 0) {
      alerts.push(`${currency.format(unpaidTotal)} in unpaid bills still due this month.`)
    }

    if (alerts.length === 0) {
      alerts.push('You are on track this month. Keep this pace.')
    }
    return alerts.slice(0, 4)
  }, [budgetCards, bills])

  const chartMax = useMemo(
    () => Math.max(...trend.map((item) => Math.max(item.income, item.expense))),
    [trend],
  )

  const reportCategoryData = useMemo(() => {
    const expenseOnly = filteredTransactions.filter((item) => item.type === 'expense')
    const total = expenseOnly.reduce((sum, item) => sum + item.amount, 0)
    const byCategory = expenseOnly.reduce((acc, item) => {
      const current = acc[item.category] ?? 0
      acc[item.category] = current + item.amount
      return acc
    }, {})

    return Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions])

  const totalGoalSaved = useMemo(() => goals.reduce((sum, goal) => sum + goal.savedAmount, 0), [goals])
  const totalGoalTarget = useMemo(() => goals.reduce((sum, goal) => sum + goal.targetAmount, 0), [goals])

  const openModalForNew = () => {
    setTransactionForm({ ...initialForm, date: `${month}-15` })
    setIsModalOpen(true)
  }

  const openModalForEdit = (item) => {
    setTransactionForm({
      id: item.id,
      type: item.type,
      amount: String(item.amount),
      merchant: item.merchant,
      category: item.category,
      account: item.account,
      date: item.date,
      notes: item.notes,
      tags: item.tags.join(', '),
      recurring: item.recurring,
      receiptName: '',
    })
    setIsModalOpen(true)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setTransactionForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setTransactionFilters((previous) => ({ ...previous, [name]: value }))
  }

  const handleReceiptPlaceholder = (event) => {
    const file = event.target.files?.[0]
    setTransactionForm((previous) => ({
      ...previous,
      receiptName: file ? file.name : '',
    }))
  }

  const submitTransaction = (event) => {
    event.preventDefault()
    const amount = Number(transactionForm.amount)
    if (!amount || amount <= 0 || !transactionForm.merchant.trim()) {
      return
    }

    const payload = {
      id: transactionForm.id ?? Date.now(),
      type: transactionForm.type,
      amount,
      merchant: transactionForm.merchant.trim(),
      category: transactionForm.category.trim() || 'Uncategorized',
      account: transactionForm.account,
      date: transactionForm.date,
      notes: transactionForm.notes.trim(),
      tags: transactionForm.tags
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      recurring: Boolean(transactionForm.recurring),
    }

    if (transactionForm.id) {
      setTransactions((previous) => previous.map((item) => (item.id === payload.id ? payload : item)))
    } else {
      setTransactions((previous) => [payload, ...previous])
    }

    setTransactionForm({ ...initialForm, date: `${month}-15`, category: transactionForm.type === 'income' ? 'Salary' : 'Groceries' })
    setIsModalOpen(false)
  }

  const deleteTransaction = (id) => {
    setTransactions((previous) => previous.filter((item) => item.id !== id))
  }

  const updateBudgetAmount = (id, amount) => {
    setBudgets((previous) => previous.map((item) => (item.id === id ? { ...item, budget: Number(amount) || 0 } : item)))
  }

  const toggleCarryOver = (id) => {
    setBudgets((previous) => previous.map((item) => (item.id === id ? { ...item, carryOver: !item.carryOver } : item)))
  }

  const addCategory = () => {
    const category = newCategory.trim()
    if (!category) return
    const exists = budgets.some((item) => item.category.toLowerCase() === category.toLowerCase())
    if (exists) return
    setBudgets((previous) => [...previous, { id: Date.now(), category, budget: 150, carryOver: true }])
    setNewCategory('')
  }

  const toggleBillPaid = (id) => {
    setBills((previous) => previous.map((bill) => (bill.id === id ? { ...bill, paid: !bill.paid } : bill)))
  }

  const addToGoal = (goalId) => {
    const amount = Number(goalContribution[goalId])
    if (!amount || amount <= 0) return
    setGoals((previous) =>
      previous.map((goal) => (goal.id === goalId ? { ...goal, savedAmount: goal.savedAmount + amount } : goal)),
    )
    setGoalContribution((previous) => ({ ...previous, [goalId]: '' }))
  }

  const setThemeMode = () => {
    setTheme((previous) => (previous === 'light' ? 'dark' : 'light'))
  }

  const onAuthFieldChange = (event) => {
    const { name, value } = event.target
    setAuthForm((previous) => ({ ...previous, [name]: value }))
  }

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    setIsAuthSubmitting(true)

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const payload = {
        email: authForm.email,
        password: authForm.password,
      }

      if (authMode === 'register') {
        payload.displayName = authForm.displayName
      }

      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setUser(result.user)
      hasHydratedRef.current = true
      setStateError('')
      setAuthForm({
        displayName: '',
        email: '',
        password: '',
      })

      try {
        const stateResult = await apiRequest('/api/state')
        const state = stateResult.state ?? {}
        if (Array.isArray(state.transactions)) setTransactions(state.transactions)
        if (Array.isArray(state.budgets)) setBudgets(state.budgets)
        if (Array.isArray(state.bills)) setBills(state.bills)
        if (Array.isArray(state.goals)) setGoals(state.goals)
        if (state.settings && typeof state.settings === 'object') {
          setSettings((previous) => ({ ...previous, ...state.settings }))
        }
        setStateError('')
      } catch {
        setStateError('Unable to load saved state for this account yet.')
      }
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // Session might already be invalid; proceed with local reset.
    }

    setUser(null)
    setStateError('')
    hasHydratedRef.current = false
    setTransactions(initialTransactions)
    setBudgets(initialBudgets)
    setBills(initialBills)
    setGoals(initialGoals)
    setSettings({
      currency: 'USD',
      reminders: true,
      alertOverspending: true,
      weeklySummary: true,
    })
    setActivePage('Dashboard')
    setTheme('light')
    setMonth('2026-04')
    setAccountFilter('All Accounts')
    setQuery('')
  }

  const renderDashboard = () => (
    <div className="page-grid">
      <section className="kpi-grid" aria-label="KPI summary cards">
        <article className="card kpi">
          <p>Total Income</p>
          <strong>{currency.format(income)}</strong>
        </article>
        <article className="card kpi">
          <p>Total Expenses</p>
          <strong>{currency.format(expenses)}</strong>
        </article>
        <article className="card kpi highlight">
          <p>Remaining Balance</p>
          <strong>{currency.format(balance)}</strong>
        </article>
        <article className="card kpi success">
          <p>Safe to Spend</p>
          <strong>{currency.format(safeToSpend)}</strong>
        </article>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Budget vs Actual</h2>
          <span>Focus categories first</span>
        </header>
        <div className="budget-list">
          {budgetCards.map((budget) => (
            <article key={budget.id} className="budget-item">
              <div className="budget-item-head">
                <h3>{budget.category}</h3>
                <span className={`status ${budget.status}`}>
                  {budget.status === 'over' ? 'Over budget' : budget.status === 'warn' ? 'Near limit' : 'On track'}
                </span>
              </div>
              <p>
                {currency.format(budget.spent)} of {currency.format(budget.budget)} used
              </p>
              <div className="bar">
                <div className={budget.status} style={{ width: `${Math.min(budget.usage, 100)}%` }} />
              </div>
              <small>
                Remaining: {currency.format(Math.max(budget.remaining, 0))} | Used: {Math.round(budget.usage)}%
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Recent Transactions</h2>
          <button type="button" className="text-btn" onClick={() => setActivePage('Transactions')}>
            View all
          </button>
        </header>
        <ul className="recent-list">
          {recentItems.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.merchant}</strong>
                <span>{item.category}</span>
              </div>
              <div>
                <strong className={item.type === 'income' ? 'income' : 'expense'}>
                  {item.type === 'income' ? '+' : '-'} {currency.format(item.amount)}
                </strong>
                <span>{item.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Upcoming Bills</h2>
          <span>Due soon</span>
        </header>
        <ul className="compact-list">
          {upcomingBills.map((bill) => (
            <li key={bill.id}>
              <span>{bill.name}</span>
              <span>{bill.dueDate}</span>
              <strong>{currency.format(bill.amount)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Income vs Expense Trend</h2>
          <span>Monthly view</span>
        </header>
        <div className="trend-chart">
          {trend.map((point) => (
            <div key={point.month} className="trend-col">
              <div className="trend-bars">
                <div className="income" style={{ height: `${(point.income / chartMax) * 120}px` }} />
                <div className="expense" style={{ height: `${(point.expense / chartMax) * 120}px` }} />
              </div>
              <span>{point.month}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Savings Goals</h2>
          <span>{currency.format(totalGoalSaved)} saved</span>
        </header>
        <div className="goals-mini">
          {goals.map((goal) => {
            const pct = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
            return (
              <article key={goal.id}>
                <div>
                  <strong>{goal.title}</strong>
                  <span>
                    {currency.format(goal.savedAmount)} / {currency.format(goal.targetAmount)}
                  </span>
                </div>
                <div className="bar">
                  <div className="goal" style={{ width: `${pct}%` }} />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Smart Insights</h2>
          <span>What needs attention</span>
        </header>
        <ul className="insights">
          {smartInsights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </section>
    </div>
  )

  const renderTransactions = () => (
    <section className="card">
      <header className="card-header">
        <h2>Transactions</h2>
        <button type="button" className="primary" onClick={openModalForNew}>
          Add Transaction
        </button>
      </header>

      <div className="filter-grid">
        <label>
          Type
          <select name="type" value={transactionFilters.type} onChange={handleFilterChange}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>
        <label>
          Category
          <select name="category" value={transactionFilters.category} onChange={handleFilterChange}>
            <option value="all">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Account
          <select name="account" value={transactionFilters.account} onChange={handleFilterChange}>
            <option value="all">All</option>
            {accounts.map((account) => (
              <option key={account} value={account}>
                {account}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min amount
          <input name="minAmount" type="number" value={transactionFilters.minAmount} onChange={handleFilterChange} />
        </label>
        <label>
          Max amount
          <input name="maxAmount" type="number" value={transactionFilters.maxAmount} onChange={handleFilterChange} />
        </label>
        <label>
          From
          <input name="fromDate" type="date" value={transactionFilters.fromDate} onChange={handleFilterChange} />
        </label>
        <label>
          To
          <input name="toDate" type="date" value={transactionFilters.toDate} onChange={handleFilterChange} />
        </label>
      </div>

      <div className="table-wrap" role="region" aria-label="Transactions table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee</th>
              <th>Category</th>
              <th>Account</th>
              <th>Tags</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>
                  <strong>{item.merchant}</strong>
                  <p>{item.notes}</p>
                </td>
                <td>{item.category}</td>
                <td>{item.account}</td>
                <td>{item.tags.join(', ')}</td>
                <td className={item.type === 'income' ? 'income' : 'expense'}>
                  {item.type === 'income' ? '+' : '-'} {currency.format(item.amount)}
                </td>
                <td>
                  <button type="button" className="text-btn" onClick={() => openModalForEdit(item)}>
                    Edit
                  </button>
                  <button type="button" className="text-btn danger" onClick={() => deleteTransaction(item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  const renderBudgets = () => (
    <section className="card">
      <header className="card-header">
        <h2>Monthly Budgets</h2>
        <span>Create custom categories and tune limits quickly</span>
      </header>

      <div className="inline-form">
        <input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Add custom category"
        />
        <button type="button" className="primary" onClick={addCategory}>
          Add Category
        </button>
      </div>

      <div className="budget-list">
        {budgetCards.map((budget) => (
          <article key={budget.id} className="budget-item">
            <div className="budget-item-head">
              <h3>{budget.category}</h3>
              <span className={`status ${budget.status}`}>
                {budget.status === 'over' ? 'Over budget' : budget.status === 'warn' ? 'Near limit' : 'On track'}
              </span>
            </div>

            <label>
              Budget Amount
              <input
                type="number"
                value={budget.budget}
                onChange={(event) => updateBudgetAmount(budget.id, event.target.value)}
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={budget.carryOver}
                onChange={() => toggleCarryOver(budget.id)}
              />
              Carry over leftover budget
            </label>

            <p>
              Spent {currency.format(budget.spent)} | Remaining {currency.format(budget.remaining)} | Used{' '}
              {Math.round(budget.usage)}%
            </p>
            <div className="bar">
              <div className={budget.status} style={{ width: `${Math.min(budget.usage, 100)}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )

  const renderBills = () => (
    <section className="card">
      <header className="card-header">
        <h2>Bills</h2>
        <span>Recurring bills and subscriptions</span>
      </header>

      <h3>Upcoming Soon</h3>
      <ul className="compact-list">
        {upcomingBills.map((bill) => (
          <li key={bill.id}>
            <span>{bill.name}</span>
            <span>{bill.dueDate}</span>
            <strong>{currency.format(bill.amount)}</strong>
          </li>
        ))}
      </ul>

      <h3>All Recurring Bills</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bill</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Frequency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.name}</td>
                <td>{bill.dueDate}</td>
                <td>{currency.format(bill.amount)}</td>
                <td>{bill.frequency}</td>
                <td>
                  <button type="button" className={`pill ${bill.paid ? 'paid' : 'unpaid'}`} onClick={() => toggleBillPaid(bill.id)}>
                    {bill.paid ? 'Paid' : 'Unpaid'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Subscriptions</h3>
      <ul className="compact-list">
        {bills
          .filter((bill) => bill.subscription)
          .map((bill) => (
            <li key={bill.id}>
              <span>{bill.name}</span>
              <span>{bill.frequency}</span>
              <strong>{currency.format(bill.amount)}</strong>
            </li>
          ))}
      </ul>
    </section>
  )

  const renderGoals = () => (
    <section className="card">
      <header className="card-header">
        <h2>Savings Goals</h2>
        <span>
          {currency.format(totalGoalSaved)} / {currency.format(totalGoalTarget)}
        </span>
      </header>

      <div className="goal-grid">
        {goals.map((goal) => {
          const pct = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
          return (
            <article key={goal.id} className="goal-card">
              <h3>{goal.title}</h3>
              <p>
                Target {currency.format(goal.targetAmount)} by {goal.targetDate}
              </p>
              <div className="bar">
                <div className="goal" style={{ width: `${pct}%` }} />
              </div>
              <small>{Math.round(pct)}% complete</small>
              <div className="inline-form">
                <input
                  type="number"
                  placeholder="Add amount"
                  value={goalContribution[goal.id] ?? ''}
                  onChange={(event) =>
                    setGoalContribution((previous) => ({ ...previous, [goal.id]: event.target.value }))
                  }
                />
                <button type="button" className="primary" onClick={() => addToGoal(goal.id)}>
                  Add Money
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )

  const renderReports = () => (
    <section className="card">
      <header className="card-header">
        <h2>Reports</h2>
        <label>
          Time Range
          <select value={reportRange} onChange={(event) => setReportRange(event.target.value)}>
            <option value="1m">Last month</option>
            <option value="3m">3 months</option>
            <option value="6m">6 months</option>
            <option value="12m">12 months</option>
          </select>
        </label>
      </header>

      <h3>Monthly Income vs Expense ({reportRange})</h3>
      <div className="trend-chart">
        {trend.map((point) => (
          <div key={point.month} className="trend-col">
            <div className="trend-bars">
              <div className="income" style={{ height: `${(point.income / chartMax) * 140}px` }} />
              <div className="expense" style={{ height: `${(point.expense / chartMax) * 140}px` }} />
            </div>
            <span>{point.month}</span>
          </div>
        ))}
      </div>

      <h3>Spending by Category</h3>
      <div className="breakdown-list">
        {reportCategoryData.map((item) => (
          <article key={item.category}>
            <div>
              <strong>{item.category}</strong>
              <span>{currency.format(item.amount)}</span>
            </div>
            <div className="bar">
              <div className="report" style={{ width: `${Math.max(item.pct, 2)}%` }} />
            </div>
            <small>{item.pct.toFixed(1)}%</small>
          </article>
        ))}
      </div>
    </section>
  )

  const renderSettings = () => (
    <section className="card settings-grid">
      <header className="card-header">
        <h2>Settings</h2>
        <span>Personalize your workspace</span>
      </header>

      <label>
        Currency
        <select
          value={settings.currency}
          onChange={(event) => setSettings((previous) => ({ ...previous, currency: event.target.value }))}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.reminders}
          onChange={() => setSettings((previous) => ({ ...previous, reminders: !previous.reminders }))}
        />
        Upcoming bill reminders
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.alertOverspending}
          onChange={() =>
            setSettings((previous) => ({ ...previous, alertOverspending: !previous.alertOverspending }))
          }
        />
        Overspending alerts
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.weeklySummary}
          onChange={() =>
            setSettings((previous) => ({ ...previous, weeklySummary: !previous.weeklySummary }))
          }
        />
        Weekly smart summary
      </label>

      <label className="checkbox-row">
        <input type="checkbox" checked={theme === 'dark'} onChange={setThemeMode} />
        Dark mode
      </label>

      <article>
        <h3>Category Management</h3>
        <ul className="tag-list">
          {categories.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  )

  const renderSecurity = () => (
    <section className="card">
      <header className="card-header">
        <h2>Security Activity</h2>
        <button type="button" className="primary" onClick={loadAuditEvents}>
          Refresh
        </button>
      </header>

      <p className="security-note">
        This feed shows account events for your user only: sign-in attempts, secure state reads/writes,
        and logout activity.
      </p>

      {isAuditLoading && <p>Loading recent activity...</p>}
      {auditError && <p className="auth-error">{auditError}</p>}

      {!isAuditLoading && !auditError && auditEvents.length === 0 && (
        <p>No security events recorded yet.</p>
      )}

      {!isAuditLoading && auditEvents.length > 0 && (
        <div className="table-wrap" role="region" aria-label="Security audit events">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>IP</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.createdAt}</td>
                  <td>{event.action}</td>
                  <td>{event.ipAddress ?? '-'}</td>
                  <td className="security-meta">{event.metadata ? JSON.stringify(event.metadata) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const pageContent = {
    Dashboard: renderDashboard(),
    Transactions: renderTransactions(),
    Budgets: renderBudgets(),
    Bills: renderBills(),
    Goals: renderGoals(),
    Reports: renderReports(),
    Security: renderSecurity(),
    Settings: renderSettings(),
  }

  if (isAuthLoading) {
    return (
      <main className="auth-screen theme-light">
        <section className="auth-card">
          <h1>Loading Budget Tracker...</h1>
          <p>Preparing your secure workspace.</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="auth-screen theme-light">
        <section className="auth-card">
          <h1>Budget Tracker</h1>
          <p>Sign in to access your private, account-locked financial data.</p>

          <div className="auth-switch">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => {
                setAuthMode('register')
                setAuthError('')
              }}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <label>
                Display Name
                <input
                  name="displayName"
                  value={authForm.displayName}
                  onChange={onAuthFieldChange}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input type="email" name="email" value={authForm.email} onChange={onAuthFieldChange} required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={onAuthFieldChange}
                minLength={8}
                required
              />
            </label>
            <button type="submit" className="primary" disabled={isAuthSubmitting}>
              {isAuthSubmitting ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {authError && <p className="auth-error">{authError}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className={`app ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <h1>Budget Tracker</h1>
          <p>Personal finance hub</p>
        </div>
        <nav aria-label="Primary">
          <ul>
            {navItems.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className={activePage === item ? 'active' : ''}
                  onClick={() => {
                    setActivePage(item)
                    setSidebarOpen(false)
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <button type="button" className="menu-btn" onClick={() => setSidebarOpen((previous) => !previous)}>
            Menu
          </button>
          <label>
            Month
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <label>
            Account
            <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
              <option>All Accounts</option>
              {accounts.map((account) => (
                <option key={account}>{account}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <input
              placeholder="Search payee, notes, tags"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button type="button" className="primary" onClick={openModalForNew}>
            Add Transaction
          </button>
          <div className="topbar-actions">
            <span className="save-state">{saveStatus}</span>
            {stateError && <span className="save-state danger-text">{stateError}</span>}
            <span className="user-chip">{user.email}</span>
            <button type="button" className="text-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <section className="page" aria-live="polite">
          {pageContent[activePage]}
        </section>
      </section>

      {isModalOpen && (
        <section className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add or edit transaction">
          <article className="modal">
            <header className="card-header">
              <h2>{transactionForm.id ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button type="button" className="text-btn" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </header>
            <form className="modal-grid" onSubmit={submitTransaction}>
              <label>
                Type
                <select
                  name="type"
                  value={transactionForm.type}
                  onChange={(event) => {
                    const nextType = event.target.value
                    setTransactionForm((previous) => ({
                      ...previous,
                      type: nextType,
                      category: nextType === 'income' ? 'Salary' : 'Groceries',
                    }))
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label>
                Amount
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={handleFieldChange}
                  required
                />
              </label>
              <label>
                Merchant / Payee
                <input
                  name="merchant"
                  value={transactionForm.merchant}
                  onChange={handleFieldChange}
                  placeholder="Store or client"
                  required
                />
              </label>
              <label>
                Category
                <input name="category" value={transactionForm.category} onChange={handleFieldChange} />
              </label>
              <label>
                Date
                <input name="date" type="date" value={transactionForm.date} onChange={handleFieldChange} required />
              </label>
              <label>
                Account
                <select name="account" value={transactionForm.account} onChange={handleFieldChange}>
                  {accounts.map((account) => (
                    <option key={account}>{account}</option>
                  ))}
                  <option>Savings</option>
                </select>
              </label>
              <label className="wide">
                Notes
                <input name="notes" value={transactionForm.notes} onChange={handleFieldChange} />
              </label>
              <label className="wide">
                Tags (comma separated)
                <input name="tags" value={transactionForm.tags} onChange={handleFieldChange} placeholder="food, family" />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={transactionForm.recurring}
                  onChange={(event) =>
                    setTransactionForm((previous) => ({ ...previous, recurring: event.target.checked }))
                  }
                />
                Recurring transaction
              </label>
              <label className="wide">
                Receipt upload (placeholder)
                <input type="file" onChange={handleReceiptPlaceholder} />
                {transactionForm.receiptName && <small>{transactionForm.receiptName}</small>}
              </label>
              <button type="submit" className="primary wide">
                {transactionForm.id ? 'Save Changes' : 'Add Transaction'}
              </button>
            </form>
          </article>
        </section>
      )}
    </main>
  )
}

export default App
