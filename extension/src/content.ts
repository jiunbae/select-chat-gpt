// Content Script for ChatGPT Share Pages
console.log("[SelectChatGPT] Content script loaded!")

// API URL 설정
const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'https://api.selectchatgpt.jiun.dev'

// 전역 상태
let messageElements: Element[] = []
let selectedCount = 0

// ChatGPT 공유 페이지인지 확인
function isChatGPTSharePage(): boolean {
  const url = window.location.href
  return url.includes('chatgpt.com/share/') || url.includes('chat.openai.com/share/')
}

function init() {
  if (!isChatGPTSharePage()) {
    console.log("[SelectChatGPT] Not a ChatGPT share page, skipping initialization")
    return
  }

  console.log("[SelectChatGPT] Initializing on:", window.location.href)
  cleanup()

  setTimeout(() => {
    createUI()
  }, 2000)
}

function cleanup() {
  document.getElementById("selectchatgpt-actionbar")?.remove()
  document.querySelectorAll('.selectchatgpt-checkbox-wrapper').forEach(el => el.remove())
  messageElements = []
  selectedCount = 0
}

function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.selectchatgpt-checkbox-wrapper input:checked')
  selectedCount = checkboxes.length
  updateActionBar()
}

function updateActionBar() {
  const countEl = document.getElementById('selectchatgpt-count')
  const shareBtn = document.getElementById('selectchatgpt-share-btn') as HTMLButtonElement
  const selectAllBtn = document.getElementById('selectchatgpt-selectall-btn') as HTMLButtonElement

  if (countEl) {
    countEl.textContent = `${selectedCount} / ${messageElements.length} selected`
  }
  if (shareBtn) {
    shareBtn.disabled = selectedCount === 0
    shareBtn.style.opacity = selectedCount === 0 ? '0.5' : '1'
    shareBtn.style.cursor = selectedCount === 0 ? 'not-allowed' : 'pointer'
  }
  if (selectAllBtn) {
    const allSelected = messageElements.length > 0 && selectedCount === messageElements.length
    selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All'
  }
}

function createUI() {
  // 메시지 찾기 및 체크박스 삽입
  createCheckboxes()

  // 플로팅 액션 바 생성
  const actionBar = document.createElement("div")
  actionBar.id = "selectchatgpt-actionbar"
  actionBar.innerHTML = `
    <div style="
      position: fixed;
      bottom: 140px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border-radius: 9999px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <span id="selectchatgpt-count" style="
        font-size: 14px;
        color: #4b5563;
        font-weight: 500;
        min-width: 110px;
      ">${selectedCount} / ${messageElements.length} selected</span>

      <div style="width: 1px; height: 24px; background: #e5e7eb;"></div>

      <button id="selectchatgpt-selectall-btn" style="
        padding: 6px 12px;
        font-size: 14px;
        color: #374151;
        background: transparent;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      ">Select All</button>

      <button id="selectchatgpt-clear-btn" style="
        padding: 6px 12px;
        font-size: 14px;
        color: #374151;
        background: transparent;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      ">Clear</button>

      <div style="width: 1px; height: 24px; background: #e5e7eb;"></div>

      <button id="selectchatgpt-share-btn" style="
        padding: 10px 20px;
        font-size: 14px;
        color: white;
        background: #10a37f;
        border: none;
        border-radius: 9999px;
        cursor: pointer;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0.5;
      " disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share
      </button>
    </div>
  `
  document.body.appendChild(actionBar)

  // 버튼 호버 효과
  const selectAllBtn = document.getElementById('selectchatgpt-selectall-btn')!
  const clearBtn = document.getElementById('selectchatgpt-clear-btn')!
  const shareBtn = document.getElementById('selectchatgpt-share-btn')!

  ;[selectAllBtn, clearBtn].forEach(btn => {
    btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6' })
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent' })
  })

  shareBtn.addEventListener('mouseenter', () => {
    if (!shareBtn.disabled) shareBtn.style.background = '#0d8a6a'
  })
  shareBtn.addEventListener('mouseleave', () => {
    shareBtn.style.background = '#10a37f'
  })

  // Select All 버튼
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.selectchatgpt-checkbox-wrapper input') as NodeListOf<HTMLInputElement>
    const allSelected = selectedCount === messageElements.length
    checkboxes.forEach(cb => { cb.checked = !allSelected })
    updateSelectedCount()
  })

  // Clear 버튼
  clearBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.selectchatgpt-checkbox-wrapper input') as NodeListOf<HTMLInputElement>
    checkboxes.forEach(cb => { cb.checked = false })
    updateSelectedCount()
  })

  // Share 버튼
  shareBtn.addEventListener('click', async () => {
    if (selectedCount === 0) return

    const selected = getSelectedMessages()
    if (selected.length === 0) return

    shareBtn.disabled = true
    shareBtn.innerHTML = `
      <svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" opacity="0.25"/>
        <path d="M4 12a8 8 0 018-8" opacity="0.75"/>
      </svg>
      Creating...
    `

    // 스피너 애니메이션 추가
    if (!document.getElementById('selectchatgpt-spinner-style')) {
      const style = document.createElement('style')
      style.id = 'selectchatgpt-spinner-style'
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
      document.head.appendChild(style)
    }

    await createShareLink(selected)

    shareBtn.disabled = selectedCount === 0
    shareBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
      Share
    `
    updateActionBar()
  })
}

function findMessageContainers(): NodeListOf<Element> | Element[] {
  const selectors = [
    '[data-message-author-role]',
    '[data-message-id]',
    'article[data-testid^="conversation-turn"]',
    '[class*="agent-turn"]',
    '[class*="user-turn"]',
    '.text-base[class*="group"]',
  ]

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        console.log(`[SelectChatGPT] Found messages with selector: ${selector}`)
        return elements
      }
    } catch (e) {
      // 무효한 선택자 무시
    }
  }

  const conversationContainer = document.querySelector('[class*="conversation"], main, [role="main"]')
  if (conversationContainer) {
    const children = Array.from(conversationContainer.children)
    const potentialMessages = children.filter(el => {
      const hasText = el.textContent && el.textContent.trim().length > 10
      const hasAvatar = el.querySelector('img, svg, [class*="avatar"]')
      return hasText && hasAvatar
    })
    if (potentialMessages.length > 0) {
      return potentialMessages
    }
  }

  return []
}

function detectMessageRole(container: Element): string {
  const role = container.getAttribute('data-message-author-role')
  if (role) return role

  const className = container.className || ''
  if (className.includes('user') || className.includes('human')) return 'user'
  if (className.includes('assistant') || className.includes('agent') || className.includes('gpt')) return 'assistant'

  const testId = container.getAttribute('data-testid') || ''
  if (testId.includes('user')) return 'user'
  if (testId.includes('assistant')) return 'assistant'

  const hasGPTIcon = container.querySelector('[class*="gpt"], [class*="openai"]')
  if (hasGPTIcon) return 'assistant'

  const parent = container.parentElement
  if (parent) {
    const siblings = Array.from(parent.children)
    const index = siblings.indexOf(container)
    return index % 2 === 0 ? 'user' : 'assistant'
  }

  return 'unknown'
}

function createCheckboxes() {
  const containers = findMessageContainers()
  messageElements = Array.from(containers)

  console.log("[SelectChatGPT] Found message containers:", messageElements.length)

  messageElements.forEach((container, index) => {
    if (container.querySelector('.selectchatgpt-checkbox-wrapper')) return

    const role = detectMessageRole(container)
    const htmlContainer = container as HTMLElement

    const computedStyle = window.getComputedStyle(htmlContainer)
    if (computedStyle.position === 'static') {
      htmlContainer.style.position = 'relative'
    }

    const checkboxWrapper = document.createElement('div')
    checkboxWrapper.className = 'selectchatgpt-checkbox-wrapper'
    checkboxWrapper.dataset.index = String(index)
    checkboxWrapper.style.cssText = `
      position: absolute;
      left: -50px;
      top: 20px;
      z-index: 9999;
      background: white;
      border-radius: 4px;
      padding: 2px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.dataset.messageIndex = String(index)
    checkbox.dataset.role = role || 'unknown'
    checkbox.style.cssText = `
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #10a37f;
      margin: 0;
      display: block;
    `

    checkbox.addEventListener('change', () => {
      updateSelectedCount()
    })
    checkbox.addEventListener('click', (e) => e.stopPropagation())
    checkboxWrapper.addEventListener('click', (e) => e.stopPropagation())

    checkboxWrapper.appendChild(checkbox)
    htmlContainer.appendChild(checkboxWrapper)
  })
}

function getSelectedMessages(): Array<{id: string, role: string, content: string, html: string}> {
  const messages: Array<{id: string, role: string, content: string, html: string}> = []
  const checkboxes = document.querySelectorAll('.selectchatgpt-checkbox-wrapper input:checked') as NodeListOf<HTMLInputElement>

  checkboxes.forEach(checkbox => {
    const index = parseInt(checkbox.dataset.messageIndex || '-1', 10)
    if (index < 0 || index >= messageElements.length) return

    const container = messageElements[index]
    if (!container) return

    let role = checkbox.dataset.role || detectMessageRole(container)
    if (role !== 'user' && role !== 'assistant') {
      role = 'user'
    }

    const messageId = container.getAttribute('data-message-id') ||
                      container.getAttribute('data-testid') ||
                      `msg-${index}-${Date.now()}`

    const contentSelectors = [
      '.markdown',
      '.whitespace-pre-wrap',
      '[class*="markdown"]',
      '[class*="prose"]',
      '.text-message',
      'p',
    ]

    let contentEl: Element | null = null
    for (const selector of contentSelectors) {
      contentEl = container.querySelector(selector)
      if (contentEl && contentEl.textContent && contentEl.textContent.trim().length > 0) {
        break
      }
    }

    const content = contentEl?.textContent || container.textContent || ''
    const html = contentEl?.innerHTML || container.innerHTML || ''

    messages.push({
      id: messageId,
      role,
      content: content.trim(),
      html
    })
  })

  return messages
}

async function createShareLink(messages: Array<{id: string, role: string, content: string, html: string}>) {
  const title = document.querySelector('h1')?.textContent || 'ChatGPT Conversation'

  try {
    const response = await fetch(`${API_BASE_URL}/api/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        sourceUrl: window.location.href,
        messages
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create share')
    }

    const data = await response.json()

    // 새 탭에서 공유 페이지 열기
    window.open(data.url, '_blank')

  } catch (error) {
    console.error('[SelectChatGPT] Error:', error)
    alert('공유 링크 생성에 실패했습니다. 서버가 실행 중인지 확인해주세요.')
  }
}

// DOM이 준비되면 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// SPA 네비게이션 대응
let lastUrl = location.href
if (isChatGPTSharePage()) {
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      cleanup()
      if (isChatGPTSharePage()) {
        setTimeout(init, 1000)
      }
    }
  }).observe(document.body, { subtree: true, childList: true })
}
