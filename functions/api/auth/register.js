import { hashPassword, makeSessionCookie, signSession } from '../_lib/auth.js'
import { writeAuditLog } from '../_lib/security.js'

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
  try {
    if (!context.env.SESSION_SECRET) {
      return jsonResponse({ error: 'Server is missing SESSION_SECRET configuration.' }, 500)
    }

    if (!context.env.DB) {
      return jsonResponse({ error: 'Server is missing DB binding configuration.' }, 500)
    }

    const { email, password, displayName } = await context.request.json().catch(() => ({}))

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName = typeof displayName === 'string' ? displayName.trim() : ''
    const passwordValue = typeof password === 'string' ? password : ''

    if (!normalizedEmail || !normalizedName || passwordValue.length < 8) {
      return jsonResponse({ error: 'Enter a valid name, email, and password (min 8 characters).' }, 400)
    }

    let existingUser
    try {
      existingUser = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(normalizedEmail)
        .first()
    } catch {
      return jsonResponse({ error: 'Database schema not initialized. Run migrations (0001, 0002, 0003).' }, 500)
    }

    if (existingUser) {
      return jsonResponse({ error: 'This email is already registered.' }, 409)
    }

    let passwordHash
    try {
      passwordHash = await hashPassword(passwordValue)
    } catch {
      return jsonResponse({ error: 'Password hashing failed. Check Worker crypto support.' }, 500)
    }

    let insertResult
    try {
      insertResult = await context.env.DB.prepare(
        'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      )
        .bind(normalizedEmail, passwordHash, normalizedName)
        .run()
    } catch {
      return jsonResponse({ error: 'Unable to create account. Verify D1 schema and retry.' }, 500)
    }

    const userId = Number(insertResult?.meta?.last_row_id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return jsonResponse({ error: 'Account creation succeeded but no user id was returned.' }, 500)
    }

    let session
    try {
      session = await signSession(userId, context.env.SESSION_SECRET)
    } catch {
      return jsonResponse({ error: 'Session signing failed. Check SESSION_SECRET configuration.' }, 500)
    }

    await writeAuditLog(context, userId, 'auth.register', {
      email: normalizedEmail,
    })

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
  } catch {
    return jsonResponse({ error: 'Unexpected server error while creating account.' }, 500)
  }
}
