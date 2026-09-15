const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  try {
    return JSON.parse(atob(padded))
  } catch (error) {
    return null
  }
}

export const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  return payload.exp <= Date.now() / 1000
}

export const clearAuthStorage = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('data')
  localStorage.removeItem('redirect')
  localStorage.removeItem('redirectPath')
  localStorage.removeItem('pccCycleId')
}
