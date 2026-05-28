/**
 * Popup.tsx — Netlight Chrome extension popup (380×520px)
 *
 * Layout (top to bottom):
 *  1. Header: logo + name + master on/off toggle
 *  2. Stats card: "You saved X MB today" (big number)
 *  3. Two stat pills: blocked count + lifetime savings
 *  4. Current site section: domain + per-site stats
 *  5. Low Data Mode toggle
 *  6. Tab bar: Today / Weekly / Lifetime
 */

import { useState } from 'react'
import type { FC } from 'react'
import { useStats } from './hooks/useStats'

/** Format bytes into a human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Format a large number with commas */
function formatNum(n: number): string {
  return n.toLocaleString()
}

type TabId = 'today' | 'weekly' | 'lifetime'

export const Popup: FC = () => {
  const { stats, currentDomain, domainStats, toggleEnabled, toggleLowData } = useStats()
  const [activeTab, setActiveTab] = useState<TabId>('today')

  // Pick which stats bucket to display based on active tab
  const tabData = stats[activeTab]

  return (
    <div className="flex flex-col h-full bg-surface-900 text-white">

      {/* ── Header ─────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
        <div className="flex items-center gap-2.5">
          {/* Netlight logo — green shield icon */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-netgreen-500 to-netgreen-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">Netlight</span>
        </div>

        {/* Master toggle */}
        <button
          className={`toggle-track ${stats.enabled ? 'active' : ''}`}
          onClick={toggleEnabled}
          aria-label={stats.enabled ? 'Disable Netlight' : 'Enable Netlight'}
          title={stats.enabled ? 'Protection ON' : 'Protection OFF'}
        >
          <div className="toggle-thumb" />
        </button>
      </header>

      {/* ── Main content area ──────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

        {/* Disabled banner */}
        {!stats.enabled && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 text-xs font-medium">Protection is off — ads and trackers are not being blocked</p>
          </div>
        )}

        {/* ── Big savings card ───────────────────── */}
        <div className="bg-surface-800 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            You saved {activeTab === 'today' ? 'today' : activeTab === 'weekly' ? 'this week' : 'all time'}
          </p>
          <p className="text-4xl font-bold stat-green tracking-tight">
            {formatBytes(tabData.bytesSaved)}
          </p>
        </div>

        {/* ── Stat pills ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-800 rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold stat-green">{formatNum(tabData.blocked)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Blocked</p>
          </div>
          <div className="bg-surface-800 rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold stat-green">{formatBytes(stats.lifetime.bytesSaved)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Lifetime</p>
          </div>
        </div>

        {/* ── Current site ───────────────────────── */}
        <div className="bg-surface-800 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Current site</p>
          </div>
          <p className="text-sm font-medium truncate mb-2">{currentDomain || 'No active tab'}</p>
          <div className="flex gap-3 text-xs text-gray-400">
            <span><span className="stat-green font-semibold">{formatNum(domainStats.blocked)}</span> blocked</span>
            <span><span className="stat-green font-semibold">{formatBytes(domainStats.bytesSaved)}</span> saved</span>
          </div>
        </div>

        {/* ── Low Data Mode ──────────────────────── */}
        <div className="bg-surface-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Low Data Mode</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Blocks media &amp; fonts</p>
          </div>
          <button
            className={`toggle-track ${stats.lowDataMode ? 'active' : ''}`}
            onClick={toggleLowData}
            disabled={!stats.enabled}
            aria-label={stats.lowDataMode ? 'Disable Low Data Mode' : 'Enable Low Data Mode'}
            style={{ opacity: stats.enabled ? 1 : 0.4 }}
          >
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────── */}
      <nav className="flex border-t border-surface-700">
        {(['today', 'weekly', 'lifetime'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors
              ${activeTab === tab
                ? 'text-netgreen-400 border-t-2 border-netgreen-400 -mt-px'
                : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  )
}
