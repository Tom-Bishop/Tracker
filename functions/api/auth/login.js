import { makeSessionCookie, signSession, verifyPassword } from '../_lib/auth.js'

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

export const onRequestPost = async (context) => {
  if (!context.env.SESSION_SECRET) {
    return jsonResponse({ error: 'Server is missing SESSION_SECRET configuration.' }, 500)
  }

  const { email, password } = await context.request.json().catch(() => ({}))

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const passwordValue = typeof password === 'string' ? password : ''

  if (!normalizedEmail || !passwordValue) {
    return jsonResponse({ error: 'Email and password are required.' }, 400)
  }

  const user = await context.env.DB.prepare(
    'SELECT id, email, display_name, password_hash FROM users WHERE email = ?',
  )
    .bind(normalizedEmail)
    .first()

  if (!user) {
    return jsonResponse({ error: 'Invalid login credentials.' }, 401)
  }

  const validPassword = await verifyPassword(passwordValue, user.password_hash)
  if (!validPassword) {
    return jsonResponse({ error: 'Invalid login credentials.' }, 401)
  }

  const session = await signSession(user.id, context.env.SESSION_SECRET)

  return jsonResponse(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    },
    200,
    {
      'Set-Cookie': makeSessionCookie(session),
    },
  )
}
