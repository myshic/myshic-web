/**
 * background/index.ts — Netlight service worker
 *
 * CRITICAL: Service workers don't persist across restarts.
 * NEVER use in-memory variables for state. Everything lives
 * in chrome.storage.local.
 *
 * Responsibilities:
 *  1. Count blocked requests (via onRuleMatchedDebug)
 *  2. Estimate bytes saved using average size lookup
 *  3. Store all stats in chrome.storage.local
 *  4. Reset "today" stats at midnight
 *  5. Master on/off toggle (enable/disable rulesets)
 *  6. Low Data Mode toggle (separate ruleset)
 */

/* ── Average sizes by resource type (bytes) ──── */
const AVG_SIZES: Record<string, number> = {
  script: 45_000,
  image: 80_000,
  xmlhttprequest: 2_000,
  sub_frame: 15_000,
  media: 500_000,
  stylesheet: 20_000,
  font: 40_000,
  other: 5_000,
}

/* ── Types ────────────────────────────────────── */
interface DomainStats {
  blocked: number
  bytesSaved: number
}

interface Stats {
  today: DomainStats
  weekly: DomainStats
  lifetime: DomainStats
  byDomain: Record<string, DomainStats>
  /** ISO date string of when "today" was last reset */
  lastResetDate: string
  /** ISO date string of when "weekly" was last reset */
  lastWeeklyResetDate: string
  /** Whether blocking is enabled */
  enabled: boolean
  /** Whether Low Data Mode is on */
  lowDataMode: boolean
}

/** Return today's date as YYYY-MM-DD */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Return the ISO week number start date (Monday) as YYYY-MM-DD */
function weekStartStr(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

/** Initialize stats if they don't exist yet */
async function ensureStats(): Promise<Stats> {
  const result = await chrome.storage.local.get('stats')
  if (result.stats) {
    return result.stats as Stats
  }
  const initial: Stats = {
    today: { blocked: 0, bytesSaved: 0 },
    weekly: { blocked: 0, bytesSaved: 0 },
    lifetime: { blocked: 0, bytesSaved: 0 },
    byDomain: {},
    lastResetDate: todayStr(),
    lastWeeklyResetDate: weekStartStr(),
    enabled: true,
    lowDataMode: false,
  }
  await chrome.storage.local.set({ stats: initial })
  return initial
}

/** Check if we need to reset daily/weekly counters */
async function maybeResetCounters(): Promise<void> {
  const stats = await ensureStats()
  let changed = false
  const today = todayStr()
  const weekStart = weekStartStr()

  // Reset daily
  if (stats.lastResetDate !== today) {
    stats.today = { blocked: 0, bytesSaved: 0 }
    stats.lastResetDate = today
    changed = true
  }

  // Reset weekly
  if (stats.lastWeeklyResetDate !== weekStart) {
    stats.weekly = { blocked: 0, bytesSaved: 0 }
    stats.lastWeeklyResetDate = weekStart
    changed = true
  }

  if (changed) {
    await chrome.storage.local.set({ stats })
  }
}

/* ── Request blocked handler ─────────────────── */
// onRuleMatchedDebug only works when the extension is loaded
// unpacked in developer mode. In production we fall back to
// counting via webNavigation + periodic checks.
// For Phase 1 MVP, onRuleMatchedDebug is the primary mechanism.
let statsQueue = Promise.resolve()

if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    statsQueue = statsQueue.then(async () => {
      try {
        await maybeResetCounters()
        const stats = await ensureStats()

        // Determine resource type
        const resourceType = info.request.type || 'other'
        const estimatedBytes = AVG_SIZES[resourceType] ?? AVG_SIZES.other

        // Extract domain from the request URL
        let domain = 'unknown'
        try {
          domain = new URL(info.request.url).hostname
        } catch {
          // URL parsing failed, keep "unknown"
        }

        // Update all stat buckets
        stats.today.blocked += 1
        stats.today.bytesSaved += estimatedBytes
        stats.weekly.blocked += 1
        stats.weekly.bytesSaved += estimatedBytes
        stats.lifetime.blocked += 1
        stats.lifetime.bytesSaved += estimatedBytes

        // Per-domain stats
        if (!stats.byDomain[domain]) {
          stats.byDomain[domain] = { blocked: 0, bytesSaved: 0 }
        }
        stats.byDomain[domain].blocked += 1
        stats.byDomain[domain].bytesSaved += estimatedBytes

        await chrome.storage.local.set({ stats })
      } catch (error) {
        console.error('Error updating stats in onRuleMatchedDebug:', error)
      }
    })
  })
}

/* ── Midnight reset alarm ────────────────────── */
chrome.alarms.create('netlight-daily-reset', {
  // Fire in 1 minute, then every 60 minutes
  delayInMinutes: 1,
  periodInMinutes: 60,
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'netlight-daily-reset') {
    await maybeResetCounters()
  }
})

/* ── Message handler (popup → background) ─────── */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATS') {
    ensureStats().then((stats) => sendResponse(stats))
    return true // async response
  }

  if (message.type === 'TOGGLE_ENABLED') {
    handleToggleEnabled().then((newState) => sendResponse(newState))
    return true
  }

  if (message.type === 'TOGGLE_LOW_DATA') {
    handleToggleLowData().then((newState) => sendResponse(newState))
    return true
  }

  return false
})

/** Toggle master on/off — enable or disable all rulesets */
async function handleToggleEnabled(): Promise<boolean> {
  const stats = await ensureStats()
  const newEnabled = !stats.enabled

  if (newEnabled) {
    // Re-enable ad + tracker rulesets
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['ads', 'trackers'],
    })
  } else {
    // Disable all rulesets
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['ads', 'trackers', 'low_data'],
    })
  }

  stats.enabled = newEnabled
  // If disabling master, also turn off low data mode
  if (!newEnabled) stats.lowDataMode = false
  await chrome.storage.local.set({ stats })
  return newEnabled
}

/** Toggle Low Data Mode — enable/disable the low_data ruleset */
async function handleToggleLowData(): Promise<boolean> {
  const stats = await ensureStats()
  const newLowData = !stats.lowDataMode

  if (newLowData) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['low_data'],
    })
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['low_data'],
    })
  }

  stats.lowDataMode = newLowData
  await chrome.storage.local.set({ stats })
  return newLowData
}

/* ── On install / update — initialise stats ──── */
chrome.runtime.onInstalled.addListener(async () => {
  await ensureStats()
  await maybeResetCounters()
})

// Also run on service worker startup
ensureStats().then(() => maybeResetCounters())
