import { requireUser } from '../_lib/auth.js'
import { writeAuditLog } from '../_lib/security.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function parseMetadata(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function maskIp(ipAddress) {
  if (!ipAddress) return null
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`
    }
  }
  return ipAddress.slice(0, 8) + '...'
}

export const onRequestGet = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const limitParam = Number(context.request.headers.get('x-audit-limit') || 60)
  const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 10), 200) : 60

  try {
    const result = await context.env.DB.prepare(
      'SELECT id, action, ip_address, user_agent, metadata_json, created_at FROM audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    )
      .bind(user.id, limit)
      .all()

    const events = (result.results ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      ipAddress: maskIp(row.ip_address),
      userAgent: row.user_agent,
      metadata: parseMetadata(row.metadata_json),
      createdAt: row.created_at,
    }))

    await writeAuditLog(context, user.id, 'audit.read', { count: events.length })

    return jsonResponse({ events })
  } catch {
    return jsonResponse({ error: 'Unable to read audit logs. Run migration 0003_audit_logs.sql.' }, 500)
  }
}
