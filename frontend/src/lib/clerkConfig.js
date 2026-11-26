const PLACEHOLDER_CLERK_KEYS = new Set([
  'pk_test_your_clerk_key_here',
  'your_clerk_publishable_key_here',
])

const LEGACY_CLERK_DOMAIN = 'clerk.farahkenawy.codes'

export function decodeClerkDomain(publishableKey) {
  if (typeof publishableKey !== 'string' || !/^pk_(test|live)_/.test(publishableKey)) {
    return ''
  }

  const encodedDomain = publishableKey.slice(publishableKey.indexOf('_', 3) + 1)

  if (!encodedDomain) {
    return ''
  }

  try {
    // Clerk keys encode the frontend API domain with base64. Accept URL-safe
    // base64 and omitted padding as well as the standard alphabet.
    const base64 = encodedDomain.replace(/-/g, '+').replace(/_/g, '/')
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const decodedValue = atob(paddedBase64)
    const decodedDomain = decodedValue.endsWith('$')
      ? decodedValue.slice(0, -1)
      : decodedValue

    if (!/^[a-z0-9.-]+$/i.test(decodedDomain) || !decodedDomain.includes('.')) {
      return ''
    }

    return decodedDomain
  } catch {
    return ''
  }
}

function getConfiguredClerkKey() {
  const configuredKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()

  if (!configuredKey || PLACEHOLDER_CLERK_KEYS.has(configuredKey)) {
    return ''
  }

  return configuredKey
}
export function resolveClerkPublishableKey() {
  const configuredKey = getConfiguredClerkKey()

  if (!configuredKey) {
    return ''
  }

  const configuredDomain = decodeClerkDomain(configuredKey)
  if (!configuredDomain) {
    console.error(
      'VITE_CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key. Set it in frontend/.env.local (or the root .env.dev when using Docker) using the value from your Clerk development instance.',
    )
    return ''
  }

  if (configuredDomain === LEGACY_CLERK_DOMAIN) {
    console.error(
      `Configured Clerk domain ${LEGACY_CLERK_DOMAIN} is no longer used. Set VITE_CLERK_PUBLISHABLE_KEY to the active Clerk domain before starting the frontend.`,
    )
    return ''
  }

  return configuredKey
}
