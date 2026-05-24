import crypto from "crypto"

export function getGravatarUrl(email: string, size: number = 80): string {
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex")
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`
}

export function gravatarUrl(email: string, size: number = 80): string {
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex")
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`
}
