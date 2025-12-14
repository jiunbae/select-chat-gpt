/**
 * Test script to verify the fix for role detection
 * Run with: npx tsx scripts/test-fix.ts <url>
 */

const URL_TO_TEST = process.argv[2] || 'https://chatgpt.com/share/69394e8e-4e80-8003-a6a7-ea7b2fb665f2'

const MIN_REACT_ROUTER_DATA_LENGTH = 1000
const ROLE_LOOKBEHIND_WINDOW = 50
const ROLE_POINTER_KEY = '_49'

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

async function testFix(url: string) {
  console.log('='.repeat(80))
  console.log('TESTING FIX: Role detection with pointer-based lookup')
  console.log('='.repeat(80))
  console.log()

  // Fetch and parse
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  })

  const html = await response.text()
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
    console.error('No valid data found!')
    return
  }

  const unescaped = JSON.parse('"' + biggestData + '"')
  const arr = JSON.parse(unescaped)

  // Build role index map (NEW LOGIC)
  console.log('1. Building role index map...')
  const roleIndexMap = new Map<number, 'user' | 'assistant'>()
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 'user' || arr[i] === 'assistant') {
      roleIndexMap.set(i, arr[i] as 'user' | 'assistant')
    }
  }

  console.log('   Role indices found:')
  roleIndexMap.forEach((role, idx) => {
    console.log(`   - Index ${idx}: ${role}`)
  })

  // New role detection function (fixed to handle objects)
  function detectRoleForContent(arr: unknown[], arrayIndex: number): { role: 'user' | 'assistant' | null; method: string } {
    for (let j = arrayIndex - 1; j >= Math.max(0, arrayIndex - ROLE_LOOKBEHIND_WINDOW); j--) {
      const val = arr[j]

      // Strategy 1: Pointer objects {"_49":IDX,...} that are actual JS objects
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>
        if (ROLE_POINTER_KEY in obj && typeof obj[ROLE_POINTER_KEY] === 'number') {
          const pointerIdx = obj[ROLE_POINTER_KEY]
          const role = roleIndexMap.get(pointerIdx)
          if (role) {
            return { role, method: `pointer at [${j}] -> idx ${pointerIdx} (${role})` }
          }
        }
      }

      // Strategy 2: Direct keyword
      if (val === 'user' || val === 'assistant') {
        return { role: val as 'user' | 'assistant', method: `direct at [${j}]` }
      }
    }

    return { role: null, method: 'NOT FOUND' }
  }

  // Find messages and detect roles
  console.log('\n2. Detecting roles for messages...')
  console.log('-'.repeat(100))
  console.log('IDX  | ROLE      | METHOD                                | CONTENT PREVIEW')
  console.log('-'.repeat(100))

  const results: Array<{ role: 'user' | 'assistant' | null; content: string }> = []
  let msgIdx = 0

  for (let i = 0; i < arr.length - 1; i++) {
    if (Array.isArray(arr[i]) && arr[i].length === 1) {
      const next = arr[i + 1]
      if (isValidMessageContent(next)) {
        const { role, method } = detectRoleForContent(arr, i)
        results.push({ role, content: next })

        const roleStr = role ? role.padEnd(9) : 'NULL'.padEnd(9)
        const contentPreview = next.substring(0, 40).replace(/\n/g, ' ')
        console.log(`${String(msgIdx).padStart(3)}  | ${roleStr} | ${method.padEnd(37)} | ${contentPreview}`)
        msgIdx++
      }
    }
  }

  console.log('-'.repeat(100))

  // Summary
  const withRole = results.filter(r => r.role !== null).length
  const withoutRole = results.filter(r => r.role === null).length
  const userCount = results.filter(r => r.role === 'user').length
  const assistantCount = results.filter(r => r.role === 'assistant').length

  console.log('\n3. Summary:')
  console.log(`   Total messages: ${results.length}`)
  console.log(`   With role detected: ${withRole} (${(withRole / results.length * 100).toFixed(1)}%)`)
  console.log(`   Without role: ${withoutRole}`)
  console.log(`   User messages: ${userCount}`)
  console.log(`   Assistant messages: ${assistantCount}`)

  if (withoutRole === 0) {
    console.log('\n✅ SUCCESS: All messages have detected roles!')
  } else {
    console.log(`\n⚠️  WARNING: ${withoutRole} messages still lack role detection`)
  }
}

testFix(URL_TO_TEST).catch(console.error)
