/**
 * useStats() — React hook for real-time Chrome storage stats.
 *
 * Listens to chrome.storage.onChanged so the popup always
 * reflects the latest data without manual refreshes.
 */

import { useState, useEffect, useCallback } from 'react'

export interface DomainStats {
  blocked: number
  bytesSaved: number
}

export interface Stats {
  today: DomainStats
  weekly: DomainStats
  lifetime: DomainStats
  byDomain: Record<string, DomainStats>
  lastResetDate: string
  lastWeeklyResetDate: string
  enabled: boolean
  lowDataMode: boolean
}

const DEFAULT_STATS: Stats = {
  today: { blocked: 0, bytesSaved: 0 },
  weekly: { blocked: 0, bytesSaved: 0 },
  lifetime: { blocked: 0, bytesSaved: 0 },
  byDomain: {},
  lastResetDate: '',
  lastWeeklyResetDate: '',
  enabled: true,
  lowDataMode: false,
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
  const [currentDomain, setCurrentDomain] = useState<string>('')

  // Fetch stats from storage
  const refresh = useCallback(async () => {
    const result = await chrome.storage.local.get('stats')
    if (result.stats) {
      setStats(result.stats as Stats)
    }
  }, [])

  // Get current tab domain
  const fetchDomain = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        const url = new URL(tab.url)
        setCurrentDomain(url.hostname)
      }
    } catch {
      setCurrentDomain('')
    }
  }, [])

  useEffect(() => {
    // Initial load
    refresh()
    fetchDomain()

    // Listen to storage changes (real-time updates)
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.stats?.newValue) {
        setStats(changes.stats.newValue as Stats)
      }
    }
    chrome.storage.onChanged.addListener(onChange)

    return () => {
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [refresh, fetchDomain])

  // Toggle master on/off
  const toggleEnabled = useCallback(async () => {
    await chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' })
    await refresh()
  }, [refresh])

  // Toggle Low Data Mode
  const toggleLowData = useCallback(async () => {
    await chrome.runtime.sendMessage({ type: 'TOGGLE_LOW_DATA' })
    await refresh()
  }, [refresh])

  // Stats for the current domain
  const domainStats: DomainStats = stats.byDomain[currentDomain] ?? { blocked: 0, bytesSaved: 0 }

  return {
    stats,
    currentDomain,
    domainStats,
    toggleEnabled,
    toggleLowData,
  }
}
