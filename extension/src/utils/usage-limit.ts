const USAGE_KEY = 'scgpt_usage'
export const MONTHLY_LIMIT = 10

interface UsageData {
  month: string
  count: number
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getStorage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

function readUsage(): UsageData {
  const storage = getStorage()
  const currentMonth = getCurrentMonth()

  if (!storage) {
    return { month: currentMonth, count: 0 }
  }

  try {
    const raw = storage.getItem(USAGE_KEY)
    if (!raw) return { month: currentMonth, count: 0 }

    const parsed = JSON.parse(raw) as Partial<UsageData>
    const month = typeof parsed.month === 'string' ? parsed.month : currentMonth
    const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : 0

    return { month, count }
  } catch {
    return { month: currentMonth, count: 0 }
  }
}

function saveUsage(data: UsageData): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(USAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage write errors
  }
}

export function resetIfNewMonth(): void {
  const currentMonth = getCurrentMonth()
  const usage = readUsage()

  if (usage.month !== currentMonth) {
    saveUsage({ month: currentMonth, count: 0 })
  }
}

export function getUsageData(): UsageData {
  const currentMonth = getCurrentMonth()
  const usage = readUsage()

  if (usage.month !== currentMonth) {
    const resetUsage = { month: currentMonth, count: 0 }
    saveUsage(resetUsage)
    return resetUsage
  }

  return usage
}

export function incrementUsage(): void {
  resetIfNewMonth()

  const usage = getUsageData()
  if (usage.count >= MONTHLY_LIMIT) return

  const updatedUsage = {
    ...usage,
    count: usage.count + 1
  }

  saveUsage(updatedUsage)
}

export function getRemainingUsage(): number {
  resetIfNewMonth()
  const usage = getUsageData()
  return Math.max(MONTHLY_LIMIT - usage.count, 0)
}

export function isLimitReached(): boolean {
  resetIfNewMonth()
  const usage = getUsageData()
  return usage.count >= MONTHLY_LIMIT
}
