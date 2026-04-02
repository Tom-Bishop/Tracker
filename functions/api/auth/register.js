import { hashPassword, makeSessionCookie, signSession } from '../_lib/auth.js'

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

  const { email, password, displayName } = await context.request.json().catch(() => ({}))

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const normalizedName = typeof displayName === 'string' ? displayName.trim() : ''
  const passwordValue = typeof password === 'string' ? password : ''

  if (!normalizedEmail || !normalizedName || passwordValue.length < 8) {
    return jsonResponse({ error: 'Enter a valid name, email, and password (min 8 characters).' }, 400)
  }

  const existingUser = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first()

  if (existingUser) {
    return jsonResponse({ error: 'This email is already registered.' }, 409)
  }

  const passwordHash = await hashPassword(passwordValue)

  const insertResult = await context.env.DB.prepare(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
  )
    .bind(normalizedEmail, passwordHash, normalizedName)
    .run()

  const userId = insertResult.meta.last_row_id
  const session = await signSession(userId, context.env.SESSION_SECRET)

  return jsonResponse(
    {
      user: {
        id: userId,
        email: normalizedEmail,
        displayName: normalizedName,
      },
    },
    201,
    {
      'Set-Cookie': makeSessionCookie(session),
    },
  )
}
