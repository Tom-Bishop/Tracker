import { requireUser } from '../_lib/auth.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function toClientTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    amount: row.amount_cents / 100,
    category: row.category,
    date: row.entry_date,
  }
}

export const onRequestGet = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const result = await context.env.DB.prepare(
    'SELECT id, type, label, amount_cents, category, entry_date FROM transactions WHERE user_id = ? ORDER BY entry_date DESC, id DESC',
  )
    .bind(user.id)
    .all()

  const transactions = (result.results ?? []).map(toClientTransaction)
  return jsonResponse({ transactions })
}

export const onRequestPost = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const body = await context.request.json().catch(() => ({}))
  const type = body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : ''
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  const amount = Number(body.amount)
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const date = typeof body.date === 'string' ? body.date : ''

  if (!type || !label || !category || !date || !Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ error: 'Invalid transaction payload.' }, 400)
  }

  const amountCents = Math.round(amount * 100)

  const insertResult = await context.env.DB.prepare(
    'INSERT INTO transactions (user_id, type, label, amount_cents, category, entry_date) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(user.id, type, label, amountCents, category, date)
    .run()

  return jsonResponse(
    {
      transaction: {
        id: insertResult.meta.last_row_id,
        type,
        label,
        amount,
        category,
        date,
      },
    },
    201,
  )
}
