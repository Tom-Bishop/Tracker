import { requireUser } from './_lib/auth.js'
import { decryptJson, encryptJson, writeAuditLog } from './_lib/security.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

const EMPTY_STATE = {
  transactions: null,
  budgets: null,
  bills: null,
  goals: null,
  settings: null,
  ui: null,
}

function enforceArrayLimit(value, maxItems, label) {
  if (value == null) return null
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`)
  }
  if (value.length > maxItems) {
    throw new Error(`${label} exceeds allowed size.`)
  }
  return value
}

function enforceObject(value, label) {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`)
  }
  return value
}

function validateStatePayload(payload) {
  const transactions = enforceArrayLimit(payload.transactions, 2000, 'transactions')
  const budgets = enforceArrayLimit(payload.budgets, 500, 'budgets')
  const bills = enforceArrayLimit(payload.bills, 500, 'bills')
  const goals = enforceArrayLimit(payload.goals, 500, 'goals')
  const settings = enforceObject(payload.settings, 'settings')
  const ui = enforceObject(payload.ui, 'ui')

  const estimatedSize = JSON.stringify({ transactions, budgets, bills, goals, settings, ui }).length
  if (estimatedSize > 900000) {
    throw new Error('State payload is too large.')
  }

  if (transactions) {
    transactions.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`transactions[${index}] must be an object.`)
      }
      if (!['income', 'expense'].includes(item.type)) {
        throw new Error(`transactions[${index}].type is invalid.`)
      }
      if (!Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0) {
        throw new Error(`transactions[${index}].amount is invalid.`)
      }
    })
  }

  return { transactions, budgets, bills, goals, settings, ui }
}

export const onRequestGet = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!context.env.DATA_ENCRYPTION_KEY) {
    return jsonResponse({ error: 'Server is missing DATA_ENCRYPTION_KEY configuration.' }, 500)
  }

  const row = await context.env.DB.prepare(
    'SELECT transactions_json, budgets_json, bills_json, goals_json, settings_json, ui_json FROM user_state WHERE user_id = ?',
  )
    .bind(user.id)
    .first()

  if (!row) {
    await writeAuditLog(context, user.id, 'state.read.empty')
    return jsonResponse({ state: EMPTY_STATE })
  }

  const encryptionSecret = context.env.DATA_ENCRYPTION_KEY

  let state
  try {
    state = {
      transactions: await decryptJson(row.transactions_json, encryptionSecret),
      budgets: await decryptJson(row.budgets_json, encryptionSecret),
      bills: await decryptJson(row.bills_json, encryptionSecret),
      goals: await decryptJson(row.goals_json, encryptionSecret),
      settings: await decryptJson(row.settings_json, encryptionSecret),
      ui: await decryptJson(row.ui_json, encryptionSecret),
    }
  } catch {
    await writeAuditLog(context, user.id, 'state.read.decrypt_failed')
    return jsonResponse({ error: 'Unable to read secure state. Check DATA_ENCRYPTION_KEY.' }, 500)
  }

  await writeAuditLog(context, user.id, 'state.read')
  return jsonResponse({
    state,
  })
}

export const onRequestPut = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!context.env.DATA_ENCRYPTION_KEY) {
    return jsonResponse({ error: 'Server is missing DATA_ENCRYPTION_KEY configuration.' }, 500)
  }

  const payload = await context.request.json().catch(() => ({}))

  let validated
  try {
    validated = validateStatePayload(payload)
  } catch (error) {
    await writeAuditLog(context, user.id, 'state.write.rejected', { reason: error.message })
    return jsonResponse({ error: error.message }, 400)
  }

  const encryptionSecret = context.env.DATA_ENCRYPTION_KEY

  const encryptedTransactions = await encryptJson(validated.transactions, encryptionSecret)
  const encryptedBudgets = await encryptJson(validated.budgets, encryptionSecret)
  const encryptedBills = await encryptJson(validated.bills, encryptionSecret)
  const encryptedGoals = await encryptJson(validated.goals, encryptionSecret)
  const encryptedSettings = await encryptJson(validated.settings, encryptionSecret)
  const encryptedUi = await encryptJson(validated.ui, encryptionSecret)

  await context.env.DB.prepare(
    `INSERT INTO user_state (
      user_id,
      transactions_json,
      budgets_json,
      bills_json,
      goals_json,
      settings_json,
      ui_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      transactions_json = excluded.transactions_json,
      budgets_json = excluded.budgets_json,
      bills_json = excluded.bills_json,
      goals_json = excluded.goals_json,
      settings_json = excluded.settings_json,
      ui_json = excluded.ui_json,
      updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(
      user.id,
      encryptedTransactions,
      encryptedBudgets,
      encryptedBills,
      encryptedGoals,
      encryptedSettings,
      encryptedUi,
    )
    .run()

  await writeAuditLog(context, user.id, 'state.write', {
    transactionsCount: validated.transactions?.length ?? 0,
    budgetsCount: validated.budgets?.length ?? 0,
    billsCount: validated.bills?.length ?? 0,
    goalsCount: validated.goals?.length ?? 0,
  })

  return jsonResponse({ ok: true })
}
