import { requireUser } from '../_lib/auth.js'
import { writeAuditLog } from '../_lib/security.js'

export const onRequestGet = async (context) => {
  const user = await requireUser(context)
  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  await writeAuditLog(context, user.id, 'auth.me')

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}
