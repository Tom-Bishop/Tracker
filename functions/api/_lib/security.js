const encoder = new TextEncoder()

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

async function deriveEncryptionKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptJson(value, secret) {
  if (!secret) {
    return JSON.stringify(value)
  }

  const key = await deriveEncryptionKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = encoder.encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

  return `enc1:${bytesToBase64Url(iv)}:${bytesToBase64Url(new Uint8Array(ciphertext))}`
}

export async function decryptJson(value, secret) {
  if (!value) {
    return null
  }

  if (!value.startsWith('enc1:')) {
    return JSON.parse(value)
  }

  if (!secret) {
    throw new Error('Encrypted payload cannot be decrypted without DATA_ENCRYPTION_KEY.')
  }

  const [, ivPart, encryptedPart] = value.split(':')
  if (!ivPart || !encryptedPart) {
    throw new Error('Corrupt encrypted payload.')
  }

  const key = await deriveEncryptionKey(secret)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(ivPart) },
    key,
    base64UrlToBytes(encryptedPart),
  )

  return JSON.parse(new TextDecoder().decode(plaintext))
}

export async function writeAuditLog(context, userId, action, metadata = null) {
  try {
    const metadataJson = metadata ? JSON.stringify(metadata).slice(0, 1800) : null
    const clientIp = context.request.headers.get('CF-Connecting-IP') ?? null
    const userAgent = context.request.headers.get('User-Agent') ?? null

    await context.env.DB.prepare(
      'INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata_json) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(userId ?? null, action, clientIp, userAgent, metadataJson)
      .run()
  } catch {
    // Keep audit logging best-effort and never block auth/data flows.
  }
}
