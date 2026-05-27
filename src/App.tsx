/**
 * App.tsx — myshic.com personal homepage
 *
 * Brand color: dark crimson red (#c0182e)
 * Logo: top-left in navbar, rounded corners
 *
 * Social links:
 *   YouTube → https://www.youtube.com/@Myshic
 *   Discord → https://discord.gg/X4xRR3WyP6
 *   GitHub  → https://github.com/myshic
 */

import type { FC } from 'react'
import './App.css'

/* ─── Social links ───────────────────────────── */
const LINKS = [
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com/@Myshic',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
      </svg>
    ),
    primary: true,
  },
  {
    id: 'discord',
    label: 'Discord',
    href: 'https://discord.gg/X4xRR3WyP6',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3c-.2.4-.5 1-.7 1.4a18.3 18.3 0 0 0-5.4 0A14 14 0 0 0 8.6 3 19.7 19.7 0 0 0 3.7 4.4 20.8 20.8 0 0 0 .3 18.5a19.9 19.9 0 0 0 6.1 3.1 15 15 0 0 0 1.3-2.1 13 13 0 0 1-2-.9l.5-.4a14.2 14.2 0 0 0 12.1 0l.5.4a13 13 0 0 1-2 .9 15 15 0 0 0 1.3 2.1 19.8 19.8 0 0 0 6-3 20.7 20.7 0 0 0-3.8-14.1zM8.3 15.2c-1.2 0-2.1-1-2.1-2.3s1-2.3 2.1-2.3c1.2 0 2.2 1 2.1 2.3 0 1.3-1 2.3-2.1 2.3zm7.4 0c-1.1 0-2.1-1-2.1-2.3s1-2.3 2.1-2.3c1.2 0 2.2 1 2.1 2.3 0 1.3-.9 2.3-2.1 2.3z"/>
      </svg>
    ),
    primary: false,
  },
  {
    id: 'github',
    label: 'GitHub',
    href: 'https://github.com/myshic',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6a3.1 3.1 0 0 0-1.3-1.8c-1.1-.7.1-.7.1-.7a2.5 2.5 0 0 1 1.8 1.2 2.5 2.5 0 0 0 3.4 1 2.5 2.5 0 0 1 .7-1.6c-2.7-.3-5.5-1.3-5.5-5.9a4.6 4.6 0 0 1 1.2-3.2 4.2 4.2 0 0 1 .1-3.2s1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2a4.2 4.2 0 0 1 .1 3.2 4.6 4.6 0 0 1 1.2 3.2c0 4.6-2.8 5.6-5.5 5.9a2.8 2.8 0 0 1 .8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/>
      </svg>
    ),
    primary: false,
  },
]

/* ─── Component ──────────────────────────────── */
const App: FC = () => {
  return (
    <div className="page-root">
      {/* Subtle dot-grid background */}
      <div className="grid-bg" aria-hidden="true" />
      {/* Radial red glow behind hero */}
      <div className="hero-glow" aria-hidden="true" />

      {/* ── Navbar — logo top-left ──────────────── */}
      <header className="navbar" id="site-nav">
        <a href="/" aria-label="Myshic home" className="nav-logo-link">
          <img
            src="/logo.png"
            alt="Myshic logo"
            className="nav-logo"
            width="36"
            height="36"
          />
          <span className="nav-brand">Myshic</span>
        </a>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <main className="hero-container">

        {/* Top badge */}
        <div className="top-badge">
          <span className="badge-dot" />
          myshic.com
        </div>

        {/* Name */}
        <h1 id="brand-name" className="hero-name">
          Myshic
        </h1>

        {/* Sub-label */}
        <p id="brand-sub" className="hero-sub">
          Content Creator &amp; Indie Developer
        </p>

        {/* CTA buttons */}
        <nav id="social-links" aria-label="Social links" className="link-row">
          {LINKS.map(({ id, label, href, icon, primary }) => (
            <a
              key={id}
              id={`link-${id}`}
              href={href}
              aria-label={`Myshic on ${label}`}
              target="_blank"
              rel="noopener noreferrer"
              className={primary ? 'btn btn-primary' : 'btn btn-ghost'}
            >
              {icon}
              {label}
            </a>
          ))}
        </nav>

      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer id="site-footer" className="site-footer">
        © 2026 Myshic · All rights reserved
      </footer>
    </div>
  )
}

export default App
