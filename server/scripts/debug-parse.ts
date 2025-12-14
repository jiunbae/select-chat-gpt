/**
 * Debug script to analyze ChatGPT share URL parsing
 * Run with: npx tsx scripts/debug-parse.ts <url>
 */

const URL_TO_DEBUG = process.argv[2] || 'https://chatgpt.com/share/69394e8e-4e80-8003-a6a7-ea7b2fb665f2'

const ROLE_LOOKBEHIND_WINDOW = 30
const MIN_REACT_ROUTER_DATA_LENGTH = 1000

// Metadata keywords (copied from parse.service.ts)
const METADATA_KEYWORDS = new Set([
  'user', 'assistant', 'system', 'text', 'parts', 'role', 'content',
  'metadata', 'author', 'message', 'status', 'finished_successfully',
  'all', 'recipient', 'weight', 'end_turn', 'children', 'parent',
  'id', 'mapping', 'create_time', 'update_time', 'model_slug',
  'default_model_slug', 'parent_id', 'channel', 'final', 'stop', 'stop_tokens',
  'finish_details', 'is_complete', 'citations', 'content_references', 'message_type',
  'next', 'origin', 'ntp', 'client_id', 'client_capability_version', 'sources',
  'request_id', 'message_source', 'turn_exchange_id', 'rebase_system_message',
  'sonic_classification_result', 'latency_ms', 'search_decision', 'classifier_config',
  'content_type', 'is_visually_hidden_from_conversation', 'shared_conversation_id',
  'loaderData', 'root', 'dd', 'traceId', 'traceTime', 'disablePrefetch',
  'shouldPrefetchAccount', 'shouldPrefetchUser', 'shouldPrefetchSystemHints',
  'promoteCss', 'disableSSR', 'statsigGateEvaluationsPromise', 'sharedConversationId',
  'serverResponse', 'type', 'data', 'client-created-root', 'history_off_approved'
])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidMessageContent(val: unknown): val is string {
  if (typeof val !== 'string') return false
  if (val.length < 2) return false
  if (METADATA_KEYWORDS.has(val) || METADATA_KEYWORDS.has(val.toLowerCase())) return false
  if (UUID_PATTERN.test(val)) return false
  if (/^\d+$/.test(val)) return false
  if (/^\d+\.\d+$/.test(val)) return false
  if (/^gpt-\d/.test(val)) return false
  if (/^[a-z0-9]{4,12}$/.test(val) && !/\s/.test(val)) return false
  if (/^[a-z0-9.-]+\.(com|org|net|edu|io|co|au)$/i.test(val)) return false
  if (val.startsWith('_') || val.startsWith('$')) return false

  const hasSpaces = val.includes(' ')
  const hasNewlines = val.includes('\n')
  const hasKorean = /[\u3131-\uD79D]/.test(val)
  const looksLikeCode = /[{}();=]/.test(val)

  return hasSpaces || hasNewlines || hasKorean || looksLikeCode
}

async function debugParse(url: string) {
  console.log('='.repeat(80))
  console.log('DEBUG PARSING:', url)
  console.log('='.repeat(80))
  console.log()

  // Fetch the page
  console.log('1. Fetching page...')
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  })

  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status}`)
    return
  }

  const html = await response.text()
  console.log(`   HTML length: ${html.length} characters`)

  // Extract React Router data
  console.log('\n2. Extracting React Router data...')
  const matches = html.matchAll(/streamController\.enqueue\("((?:[^"\\]|\\.)*)"\)/g)
  let biggestData: string | null = null
  let biggestLen = 0

  for (const m of matches) {
    if (m[1].length > biggestLen) {
      biggestLen = m[1].length
      biggestData = m[1]
    }
  }

  if (!biggestData || biggestLen < MIN_REACT_ROUTER_DATA_LENGTH) {
    console.error('   No valid React Router data found!')
    return
  }

  console.log(`   Found data of length: ${biggestLen}`)

  // Parse the double-encoded JSON
  console.log('\n3. Parsing double-encoded JSON...')
  const unescaped = JSON.parse('"' + biggestData + '"')
  const arr = JSON.parse(unescaped)

  if (!Array.isArray(arr)) {
    console.error('   Parsed data is not an array!')
    return
  }

  console.log(`   Array length: ${arr.length}`)

  // Find all role keywords
  console.log('\n4. Finding all role keywords in array...')
  const roleLocations: Array<{ index: number; role: string; prevKey: unknown }> = []
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 'user' || arr[i] === 'assistant') {
      roleLocations.push({
        index: i,
        role: arr[i],
        prevKey: i > 0 ? arr[i - 1] : null
      })
    }
  }
  console.log(`   Found ${roleLocations.length} role keywords`)

  // Show role locations with context
  console.log('\n   Role keyword locations (showing if preceded by "role"):')
  for (const loc of roleLocations) {
    const isRoleKey = loc.prevKey === 'role'
    console.log(`   [${loc.index}] ${loc.role} (prev: "${loc.prevKey}") ${isRoleKey ? '✓ ROLE KEY' : ''}`)
  }

  // Find messages using Array(1) pattern
  console.log('\n5. Finding messages using Array(1) pattern...')
  const rawMessages: Array<{
    arrayIndex: number
    contentIndex: number
    content: string
    detectedRole: 'user' | 'assistant' | null
    lookbehindInfo: string
  }> = []

  for (let i = 0; i < arr.length - 1; i++) {
    if (Array.isArray(arr[i]) && arr[i].length === 1) {
      const next = arr[i + 1]
      if (isValidMessageContent(next)) {
        const contentIndex = i + 1

        // Look backwards for role
        let role: 'user' | 'assistant' | null = null
        let lookbehindInfo = ''
        for (let j = i - 1; j >= Math.max(0, i - ROLE_LOOKBEHIND_WINDOW); j--) {
          if (arr[j] === 'user') {
            role = 'user'
            lookbehindInfo = `found 'user' at index ${j} (distance: ${i - j})`
            break
          }
          if (arr[j] === 'assistant') {
            role = 'assistant'
            lookbehindInfo = `found 'assistant' at index ${j} (distance: ${i - j})`
            break
          }
        }

        if (!role) {
          lookbehindInfo = `NO ROLE FOUND within ${ROLE_LOOKBEHIND_WINDOW} elements`
        }

        rawMessages.push({
          arrayIndex: i,
          contentIndex,
          content: next.substring(0, 80) + (next.length > 80 ? '...' : ''),
          detectedRole: role,
          lookbehindInfo
        })
      }
    }
  }

  console.log(`   Found ${rawMessages.length} potential messages`)

  // Show message analysis
  console.log('\n6. Message analysis:')
  console.log('-'.repeat(120))
  console.log('IDX  | ARRAY_IDX | DETECTED_ROLE | LOOKBEHIND INFO                                      | CONTENT PREVIEW')
  console.log('-'.repeat(120))

  let lastRole: 'user' | 'assistant' | null = null
  for (let idx = 0; idx < rawMessages.length; idx++) {
    const m = rawMessages[idx]

    // Calculate final role (with fallback)
    let finalRole: string
    if (m.detectedRole) {
      finalRole = m.detectedRole
    } else {
      finalRole = lastRole === 'user' ? 'assistant' : 'user'
      finalRole = `${finalRole} (FALLBACK!)`
    }
    lastRole = m.detectedRole || (lastRole === 'user' ? 'assistant' : 'user') as 'user' | 'assistant'

    const detected = m.detectedRole ? m.detectedRole.padEnd(9) : 'NULL'.padEnd(9)
    console.log(
      `${String(idx).padStart(3)}  | ${String(m.arrayIndex).padStart(9)} | ${detected}     | ${m.lookbehindInfo.padEnd(52)} | ${m.content.substring(0, 40)}`
    )
  }

  console.log('-'.repeat(120))

  // Identify problematic messages
  console.log('\n7. Problematic messages (no detected role):')
  const problemMessages = rawMessages.filter(m => !m.detectedRole)
  if (problemMessages.length === 0) {
    console.log('   None! All messages have detected roles.')
  } else {
    for (const m of problemMessages) {
      console.log(`   - Index ${m.contentIndex}: "${m.content.substring(0, 50)}..."`)
    }
  }

  // Check for role key pattern
  console.log('\n8. Checking if roles are preceded by "role" key:')
  for (const loc of roleLocations.slice(0, 20)) {
    if (loc.prevKey === 'role') {
      console.log(`   ✓ [${loc.index}] ${loc.role} is a proper role assignment`)
    }
  }

  // Deep dive: show context around a problem message
  if (problemMessages.length > 0) {
    const firstProblem = problemMessages[0]
    console.log(`\n9. Context around first problematic message (index ${firstProblem.contentIndex}):`)
    const start = Math.max(0, firstProblem.arrayIndex - 50)
    const end = Math.min(arr.length, firstProblem.arrayIndex + 10)
    for (let i = start; i < end; i++) {
      const val = arr[i]
      const marker = i === firstProblem.arrayIndex ? ' <-- ARRAY(1)' :
                     i === firstProblem.contentIndex ? ' <-- CONTENT' :
                     val === 'user' || val === 'assistant' ? ' <-- ROLE' : ''
      const display = typeof val === 'string'
        ? (val.length > 60 ? val.substring(0, 60) + '...' : val)
        : JSON.stringify(val)?.substring(0, 60)
      console.log(`   [${i}] ${display}${marker}`)
    }
  }
}

debugParse(URL_TO_DEBUG).catch(console.error)
