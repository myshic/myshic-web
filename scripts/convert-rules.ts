/**
 * convert-rules.ts
 *
 * Downloads EasyList and EasyPrivacy filter lists, converts them
 * to Chrome MV3 declarativeNetRequest JSON format, trims to the
 * top 20,000 rules each, and writes:
 *   packages/extension/public/rules/ads.json
 *   packages/extension/public/rules/trackers.json
 *
 * Run with: pnpm convert-rules  (from repo root)
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* ── Filter list URLs ─────────────────────────── */
const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt'
const EASYPRIVACY_URL = 'https://easylist.to/easylist/easyprivacy.txt'

const MAX_RULES = 20_000
const OUTPUT_DIR = join(__dirname, '..', 'packages', 'extension', 'public', 'rules')

/* ── Types ────────────────────────────────────── */
interface DNRRule {
  id: number
  priority: number
  action: { type: string }
  condition: {
    urlFilter?: string
    resourceTypes?: string[]
    isUrlFilterCaseSensitive?: boolean
  }
}

/* ── Resource type mapping ────────────────────── */
// EasyList uses $type options — map them to MV3 resource types
const RESOURCE_MAP: Record<string, string> = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  font: 'font',
  media: 'media',
  xmlhttprequest: 'xmlhttprequest',
  'sub_frame': 'sub_frame',
  subdocument: 'sub_frame',
  object: 'object',
  ping: 'ping',
  websocket: 'websocket',
  other: 'other',
}

const ALL_RESOURCE_TYPES = [
  'script', 'image', 'stylesheet', 'font', 'media',
  'xmlhttprequest', 'sub_frame', 'object', 'ping',
  'websocket', 'other', 'main_frame',
]

/**
 * Parse a single filter line into a DNR rule (or null if unparsable).
 *
 * We only handle basic blocking rules — no cosmetic filters,
 * no regex rules, no allowlist ($@$) rules. This gets us the
 * highest-impact rules which are simple URL pattern blocks.
 */
function parseFilterLine(line: string, id: number): DNRRule | null {
  // Skip comments and metadata
  if (!line || line.startsWith('!') || line.startsWith('[')) return null

  // Skip cosmetic / element hiding rules
  if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) return null

  // Skip allowlist / exception rules
  if (line.startsWith('@@')) return null

  // Split the rule from options
  let filter = line
  let options = ''
  const dollarIdx = line.lastIndexOf('$')
  if (dollarIdx > 0) {
    filter = line.substring(0, dollarIdx)
    options = line.substring(dollarIdx + 1)
  }

  // Skip if the filter part is empty or too short
  if (filter.length < 3) return null

  // Parse options for resource types
  let resourceTypes: string[] | undefined
  const optParts = options ? options.split(',') : []

  // Check for negated types or unsupported options
  for (const opt of optParts) {
    if (opt.startsWith('~') || opt === 'popup' || opt === 'document') {
      // We can't represent negated types easily; skip these
      // popup and document are not standard resource types
    }
  }

  // Collect positive resource type options
  const positiveTypes: string[] = []
  for (const opt of optParts) {
    const mapped = RESOURCE_MAP[opt.toLowerCase()]
    if (mapped) positiveTypes.push(mapped)
  }

  if (positiveTypes.length > 0) {
    resourceTypes = positiveTypes
  }

  // Convert filter to urlFilter pattern
  let urlFilter = filter

  // Handle || (domain anchor)
  if (urlFilter.startsWith('||')) {
    urlFilter = urlFilter.substring(2)
    // MV3 urlFilter with || means "match domain boundary"
    urlFilter = '||' + urlFilter
  }
  // Handle | (start anchor)
  else if (urlFilter.startsWith('|')) {
    urlFilter = urlFilter.substring(1)
    urlFilter = '|' + urlFilter
  }

  // Handle trailing |
  if (urlFilter.endsWith('|')) {
    urlFilter = urlFilter.substring(0, urlFilter.length - 1) + '|'
  }

  // Handle ^ (separator — matches anything that's not alphanumeric, _, -, ., %)
  // MV3 supports ^ natively in urlFilter

  // Sanity: skip overly broad or empty filters
  if (urlFilter.length < 3) return null
  if (urlFilter === '*' || urlFilter === '||') return null

  const rule: DNRRule = {
    id,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter,
      isUrlFilterCaseSensitive: false,
    },
  }

  if (resourceTypes) {
    rule.condition.resourceTypes = resourceTypes
  } else {
    // Default: block all resource types except main_frame
    // (we don't want to block entire page loads)
    rule.condition.resourceTypes = ALL_RESOURCE_TYPES.filter(t => t !== 'main_frame')
  }

  return rule
}

/**
 * Download a filter list, parse, dedupe, and return top N rules.
 * We prioritise rules with domain anchors (||) because they
 * target specific ad/tracker domains and are highest-impact.
 */
async function convertList(url: string, startId: number, maxRules: number): Promise<DNRRule[]> {
  console.log(`  Downloading ${url} ...`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`)
  const text = await response.text()
  const lines = text.split('\n')
  console.log(`  Downloaded ${lines.length} lines`)

  // Parse all valid rules
  const rules: DNRRule[] = []
  let nextId = startId
  const seenFilters = new Set<string>()

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (seenFilters.has(line)) continue
    seenFilters.add(line)

    const rule = parseFilterLine(line, nextId)
    if (rule) {
      rules.push(rule)
      nextId++
    }
  }

  console.log(`  Parsed ${rules.length} valid rules`)

  // Sort: prioritise domain-anchored rules (||) — they're highest impact
  rules.sort((a, b) => {
    const aAnchored = a.condition.urlFilter?.startsWith('||') ? 1 : 0
    const bAnchored = b.condition.urlFilter?.startsWith('||') ? 1 : 0
    return bAnchored - aAnchored
  })

  // Trim to max
  const trimmed = rules.slice(0, maxRules)

  // Re-assign sequential IDs
  trimmed.forEach((r, i) => { r.id = startId + i })

  console.log(`  Kept top ${trimmed.length} rules`)
  return trimmed
}

/* ── Main ─────────────────────────────────────── */
async function main() {
  console.log('🔄 Converting filter lists to MV3 declarativeNetRequest format...\n')

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true })

  // Convert EasyList → ads.json
  console.log('📋 EasyList (ads):')
  const adsRules = await convertList(EASYLIST_URL, 1, MAX_RULES)
  const adsPath = join(OUTPUT_DIR, 'ads.json')
  writeFileSync(adsPath, JSON.stringify(adsRules, null, 2))
  console.log(`  ✅ Wrote ${adsRules.length} rules to ads.json\n`)

  // Convert EasyPrivacy → trackers.json
  // Start IDs at 100001 to avoid collisions with ads rules
  console.log('🔒 EasyPrivacy (trackers):')
  const trackerRules = await convertList(EASYPRIVACY_URL, 100_001, MAX_RULES)
  const trackersPath = join(OUTPUT_DIR, 'trackers.json')
  writeFileSync(trackersPath, JSON.stringify(trackerRules, null, 2))
  console.log(`  ✅ Wrote ${trackerRules.length} rules to trackers.json\n`)

  console.log('🎉 Done! Rules written to:')
  console.log(`   ${adsPath}`)
  console.log(`   ${trackersPath}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
