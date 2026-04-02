import { requireUser } from '../_lib/auth.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const onRequestDelete = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const transactionId = Number(context.params.id)
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return jsonResponse({ error: 'Invalid transaction id.' }, 400)
  }

  const result = await context.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .bind(transactionId, user.id)
    .run()

  if ((result.meta.changes ?? 0) === 0) {
    return jsonResponse({ error: 'Transaction not found.' }, 404)
  }

  return jsonResponse({ ok: true })
}
