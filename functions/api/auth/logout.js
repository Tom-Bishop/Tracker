import { clearSessionCookie, requireUser } from '../_lib/auth.js'
import { writeAuditLog } from '../_lib/security.js'

export const onRequestPost = async (context) => {
  const user = await requireUser(context)
  await writeAuditLog(context, user?.id ?? null, 'auth.logout')

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  })
}
