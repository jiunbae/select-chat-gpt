/**
 * Debug script v2 - Analyze message parent-child structure
 * Run with: npx tsx scripts/debug-parse-v2.ts <url>
 */

const URL_TO_DEBUG = process.argv[2] || 'https://chatgpt.com/share/69394e8e-4e80-8003-a6a7-ea7b2fb665f2'

const MIN_REACT_ROUTER_DATA_LENGTH = 1000

async function debugParseV2(url: string) {
  console.log('='.repeat(80))
  console.log('DEBUG PARSING V2 - Analyzing message structure')
  console.log('='.repeat(80))

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

  console.log(`Array length: ${arr.length}`)

  // Find all message IDs (UUIDs) and their roles
  console.log('\n1. Searching for role assignments in the data...')

  // Look for patterns like: "role" followed by "user" or "assistant"
  const roleAssignments: Array<{ index: number; role: string; messageId: string | null }> = []

  for (let i = 0; i < arr.length - 2; i++) {
    if (arr[i] === 'role' && (arr[i + 1] === 'user' || arr[i + 1] === 'assistant')) {
      // Try to find the message ID nearby
      let messageId: string | null = null
      // Look backwards for a UUID
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        if (typeof arr[j] === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}/.test(arr[j])) {
          messageId = arr[j]
          break
        }
      }
      roleAssignments.push({ index: i, role: arr[i + 1], messageId })
    }
  }

  console.log(`Found ${roleAssignments.length} role assignments:`)
  for (const ra of roleAssignments) {
    console.log(`  [${ra.index}] role: "${ra.role}" (messageId: ${ra.messageId || 'N/A'})`)
  }

  // Find author.role pattern (common in ChatGPT data)
  console.log('\n2. Searching for author.role pattern...')
  for (let i = 0; i < arr.length - 3; i++) {
    if (arr[i] === 'author' && typeof arr[i + 1] === 'object' && arr[i + 1] !== null) {
      console.log(`  [${i}] author: ${JSON.stringify(arr[i + 1])}`)
    }
  }

  // Analyze the structure around role keywords
  console.log('\n3. Context around "user" at index 105:')
  for (let i = 100; i < 120 && i < arr.length; i++) {
    const val = arr[i]
    const display = typeof val === 'string'
      ? (val.length > 60 ? val.substring(0, 60) + '...' : val)
      : JSON.stringify(val)?.substring(0, 80)
    console.log(`  [${i}] ${display}`)
  }

  console.log('\n4. Context around "assistant" at index 142:')
  for (let i = 137; i < 157 && i < arr.length; i++) {
    const val = arr[i]
    const display = typeof val === 'string'
      ? (val.length > 60 ? val.substring(0, 60) + '...' : val)
      : JSON.stringify(val)?.substring(0, 80)
    console.log(`  [${i}] ${display}`)
  }

  // Find 'parts' arrays which contain actual message content
  console.log('\n5. Searching for "parts" arrays...')
  const partsLocations: number[] = []
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 'parts') {
      partsLocations.push(i)
    }
  }
  console.log(`Found ${partsLocations.length} "parts" occurrences`)
  console.log('First 10:', partsLocations.slice(0, 10))

  // Analyze parent-child relationships via parent_id
  console.log('\n6. Analyzing parent_id relationships...')
  const parentIds: Array<{ index: number; parentId: string }> = []
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === 'parent_id' && typeof arr[i + 1] === 'string') {
      parentIds.push({ index: i, parentId: arr[i + 1] })
    }
  }
  console.log(`Found ${parentIds.length} parent_id entries`)

  // Find message_id entries
  console.log('\n7. Looking for message IDs with roles...')
  const messagePattern: Array<{ id: string; role: string; contentStart: number }> = []

  // Strategy: Look for patterns where role and content are close together
  for (let i = 0; i < arr.length - 50; i++) {
    // Find a role
    if (arr[i] === 'user' || arr[i] === 'assistant') {
      // Check if this is an actual role (not just a string in content)
      // Look for nearby structure markers
      let isRole = false
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (arr[j] === 'role') {
          isRole = true
          break
        }
      }

      if (!isRole) {
        // Also check if preceded by an object structure
        if (i > 0 && typeof arr[i - 1] === 'object' && arr[i - 1] !== null) {
          isRole = true
        }
      }

      if (isRole) {
        // Look for content nearby
        for (let j = i + 1; j < Math.min(arr.length, i + 50); j++) {
          if (Array.isArray(arr[j]) && arr[j].length === 1 && typeof arr[j + 1] === 'string' && arr[j + 1].length > 20) {
            console.log(`  Role "${arr[i]}" at [${i}] -> Content at [${j + 1}]: "${(arr[j + 1] as string).substring(0, 50)}..."`)
            break
          }
        }
      }
    }
  }

  // NEW: Look for the actual message structure
  console.log('\n8. Looking for message structures with author.role pattern...')

  // ChatGPT often has this pattern:
  // {...} -> author -> role -> user/assistant -> ... -> parts -> [...] -> content

  // Let's find objects that might contain role info
  for (let i = 0; i < Math.min(500, arr.length); i++) {
    if (typeof arr[i] === 'string' && arr[i].startsWith('{') && arr[i].includes('_')) {
      // This might be a pointer object
      try {
        const obj = JSON.parse(arr[i].replace(/"_(\d+)":/g, '"_$1":'))
        if (obj) {
          console.log(`  [${i}] Pointer object: ${arr[i].substring(0, 100)}`)
        }
      } catch {
        // Not a valid JSON pointer
      }
    }
  }

  // Find actual text content
  console.log('\n9. First 10 Array(1) + content patterns:')
  let count = 0
  for (let i = 0; i < arr.length - 1 && count < 10; i++) {
    if (Array.isArray(arr[i]) && arr[i].length === 1) {
      const next = arr[i + 1]
      if (typeof next === 'string' && next.length > 20 && next.includes(' ')) {
        console.log(`\n  [${i}] -> [${i + 1}]: "${next.substring(0, 80)}..."`)
        // Show 20 elements before
        console.log('  Context before:')
        for (let j = Math.max(0, i - 15); j < i; j++) {
          const val = arr[j]
          const display = typeof val === 'string'
            ? (val.length > 40 ? val.substring(0, 40) + '...' : val)
            : JSON.stringify(val)?.substring(0, 50)
          const marker = val === 'user' || val === 'assistant' ? ' <-- ROLE' : ''
          console.log(`    [${j}] ${display}${marker}`)
        }
        count++
      }
    }
  }
}

debugParseV2(URL_TO_DEBUG).catch(console.error)
