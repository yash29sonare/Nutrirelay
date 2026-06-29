function locale(): string {
  return "en-IN"
}

export function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatRelativeDate(iso: string | Date): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`

  return formatDate(iso)
}

export function formatNumber(value: number): string {
  return value.toLocaleString(locale())
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`
}

export function formatPercentOf(current: number, target: number): string {
  if (target <= 0) return "0%"
  return formatPercent(Math.round((current / target) * 100))
}

export function formatConfidence(score: number): string {
  if (score >= 80) return `High (${formatPercent(score)})`
  if (score >= 50) return `Medium (${formatPercent(score)})`
  return `Low (${formatPercent(score)})`
}
