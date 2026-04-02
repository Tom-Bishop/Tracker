import { requireUser } from './_lib/auth.js'

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

export const onRequestGet = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const row = await context.env.DB.prepare(
    'SELECT transactions_json, budgets_json, bills_json, goals_json, settings_json, ui_json FROM user_state WHERE user_id = ?',
  )
    .bind(user.id)
    .first()

  if (!row) {
    return jsonResponse({ state: EMPTY_STATE })
  }

  return jsonResponse({
    state: {
      transactions: row.transactions_json ? JSON.parse(row.transactions_json) : null,
      budgets: row.budgets_json ? JSON.parse(row.budgets_json) : null,
      bills: row.bills_json ? JSON.parse(row.bills_json) : null,
      goals: row.goals_json ? JSON.parse(row.goals_json) : null,
      settings: row.settings_json ? JSON.parse(row.settings_json) : null,
      ui: row.ui_json ? JSON.parse(row.ui_json) : null,
    },
  })
}

export const onRequestPut = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const payload = await context.request.json().catch(() => ({}))

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
      JSON.stringify(payload.transactions ?? null),
      JSON.stringify(payload.budgets ?? null),
      JSON.stringify(payload.bills ?? null),
      JSON.stringify(payload.goals ?? null),
      JSON.stringify(payload.settings ?? null),
      JSON.stringify(payload.ui ?? null),
    )
    .run()

  return jsonResponse({ ok: true })
}
