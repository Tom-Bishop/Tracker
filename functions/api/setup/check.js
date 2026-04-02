import { requireUser } from '../_lib/auth.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

async function tableExists(db, tableName) {
  const row = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .bind(tableName)
    .first()
  return Boolean(row?.name)
}

export const onRequestGet = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!context.env.DB) {
    return jsonResponse({
      checks: [
        {
          key: 'db_binding',
          label: 'D1 binding (DB)',
          ok: false,
          detail: 'Missing DB binding in Cloudflare Pages settings.',
        },
      ],
      allOk: false,
    })
  }

  const checks = []

  checks.push({
    key: 'session_secret',
    label: 'SESSION_SECRET configured',
    ok: Boolean(context.env.SESSION_SECRET),
    detail: context.env.SESSION_SECRET
      ? 'SESSION_SECRET is set.'
      : 'SESSION_SECRET is missing in environment variables.',
  })

  checks.push({
    key: 'data_encryption_key',
    label: 'DATA_ENCRYPTION_KEY configured',
    ok: Boolean(context.env.DATA_ENCRYPTION_KEY),
    detail: context.env.DATA_ENCRYPTION_KEY
      ? 'DATA_ENCRYPTION_KEY is set.'
      : 'DATA_ENCRYPTION_KEY is missing in environment variables.',
  })

  const requiredTables = ['users', 'transactions', 'user_state', 'audit_logs']

  for (const tableName of requiredTables) {
    let ok = false
    try {
      ok = await tableExists(context.env.DB, tableName)
    } catch {
      ok = false
    }

    checks.push({
      key: `table_${tableName}`,
      label: `Table: ${tableName}`,
      ok,
      detail: ok
        ? `Table ${tableName} exists.`
        : `Table ${tableName} is missing. Run the related migration.`,
    })
  }

  const allOk = checks.every((item) => item.ok)

  return jsonResponse({ checks, allOk })
}
