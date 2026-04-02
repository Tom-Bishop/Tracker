const encoder = new TextEncoder()

const PASSWORD_ITERATIONS = 210000
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function bytesToBase64Url(bytes) {
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function hmacSign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(signature))
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') ?? ''
  const prefix = `${name}=`
  const match = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))

  return match ? match.slice(prefix.length) : null
}

export function makeSessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie() {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  return `pbkdf2$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, iterationString, saltString, expectedHash] = storedHash.split('$')
  if (algorithm !== 'pbkdf2' || !iterationString || !saltString || !expectedHash) {
    return false
  }

  const iterations = Number(iterationString)
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false
  }

  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64UrlToBytes(saltString),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  const computed = bytesToBase64Url(new Uint8Array(bits))

  if (computed.length !== expectedHash.length) {
    return false
  }

  let mismatch = 0
  for (let index = 0; index < computed.length; index += 1) {
    mismatch |= computed.charCodeAt(index) ^ expectedHash.charCodeAt(index)
  }

  return mismatch === 0
}

export async function signSession(userId, secret) {
  const payload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const payloadString = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await hmacSign(payloadString, secret)
  return `${payloadString}.${signature}`
}

export async function verifySession(token, secret) {
  if (!token || !secret) {
    return null
  }

  const [payloadString, signature] = token.split('.')
  if (!payloadString || !signature) {
    return null
  }

  const expectedSignature = await hmacSign(payloadString, secret)
  if (expectedSignature.length !== signature.length) {
    return null
  }

  let mismatch = 0
  for (let index = 0; index < signature.length; index += 1) {
    mismatch |= expectedSignature.charCodeAt(index) ^ signature.charCodeAt(index)
  }

  if (mismatch !== 0) {
    return null
  }

  const payload = parseJsonSafely(new TextDecoder().decode(base64UrlToBytes(payloadString)))
  if (!payload || typeof payload.uid !== 'number' || typeof payload.exp !== 'number') {
    return null
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

export async function requireUser(context) {
  const token = getCookie(context.request, 'session')
  const session = await verifySession(token, context.env.SESSION_SECRET)
  if (!session) {
    return null
  }

  const user = await context.env.DB.prepare('SELECT id, email, display_name FROM users WHERE id = ?')
    .bind(session.uid)
    .first()

  return user ?? null
}
