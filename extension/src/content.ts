// Content Script for ChatGPT Share Pages
import "./content.css"
import { createShare, NetworkError, getErrorMessage, isOnline } from "~src/utils/api"
import { Analytics } from "~src/utils/analytics"

console.log("[SelectChatGPT] Content script loaded!")

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

  // Track page view
  Analytics.pageView(window.location.href)

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

  // 버튼 이벤트 바인딩
  const selectAllBtn = document.getElementById('selectchatgpt-selectall-btn')
  const clearBtn = document.getElementById('selectchatgpt-clear-btn')
  const shareBtn = document.getElementById('selectchatgpt-share-btn')

  if (!selectAllBtn || !clearBtn || !shareBtn) {
    console.error('[SelectChatGPT] Action bar buttons not found')
    return
  }

  // 호버 효과는 content.css에서 처리

  // Select All 버튼
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.selectchatgpt-checkbox-wrapper input') as NodeListOf<HTMLInputElement>
    const allSelected = selectedCount === messageElements.length
    checkboxes.forEach(cb => { cb.checked = !allSelected })
    updateSelectedCount()

    // Track select/deselect all
    if (!allSelected) {
      Analytics.selectAll(messageElements.length)
    } else {
      Analytics.deselectAll()
    }
  })

  // Clear 버튼
  clearBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.selectchatgpt-checkbox-wrapper input') as NodeListOf<HTMLInputElement>
    checkboxes.forEach(cb => { cb.checked = false })
    updateSelectedCount()

    // Track deselect all
    Analytics.deselectAll()
  })

  // Share 버튼
  shareBtn.addEventListener('click', async () => {
    if (selectedCount === 0) return

    const selected = getSelectedMessages()
    if (selected.length === 0) return

    // Track share clicked
    Analytics.shareClicked(selected.length)

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

    console.log("[SelectChatGPT] Selected messages:", selected)
    await createShareLinkHandler(selected)

    // 버튼 상태 복원
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

async function createShareLinkHandler(messages: Array<{id: string, role: string, content: string, html: string}>) {
  const title = document.querySelector('h1')?.textContent || 'ChatGPT Conversation'

  // 오프라인 상태 사전 체크
  if (!isOnline()) {
    showErrorToast('인터넷 연결이 끊겼습니다. 네트워크 연결을 확인해주세요.')
    return
  }

  // 로딩 표시
  showLoadingToast('공유 링크 생성 중...')

  try {
    const data = await createShare({
      title,
      sourceUrl: window.location.href,
      messages: messages.map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant'
      }))
    })

    hideToast()

    // Track share created
    Analytics.shareCreated(data.id, messages.length)

    // 새 탭에서 공유 페이지 열기 (팝업 차단 대응)
    const newTab = window.open(data.url, '_blank')
    if (!newTab) {
      // 팝업이 차단된 경우 클립보드에 복사하고 토스트로 알림
      await navigator.clipboard.writeText(data.url)
      showSuccessToast(`팝업이 차단되어 링크를 클립보드에 복사했습니다.\n${data.url}`)
    } else {
      // 정상적으로 열린 경우에도 클립보드에 복사
      await navigator.clipboard.writeText(data.url)
      showSuccessToast(`공유 링크가 클립보드에 복사되었습니다!\n${data.url}`)
    }

  } catch (error) {
    hideToast()
    console.error('[SelectChatGPT] Error:', error)

    // Track share failed
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    Analytics.shareFailed(errorMessage)

    if (error instanceof NetworkError) {
      showErrorToast(getErrorMessage(error))
    } else if (error instanceof Error) {
      showErrorToast(error.message || '공유 링크 생성에 실패했습니다.')
    } else {
      showErrorToast('알 수 없는 오류가 발생했습니다.')
    }
  }
}

// Toast 알림 UI 함수들
let currentToast: HTMLDivElement | null = null

function createToastElement(): HTMLDivElement {
  if (currentToast) {
    currentToast.remove()
  }

  const toast = document.createElement('div')
  toast.id = 'selectchatgpt-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 10001;
    max-width: 350px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease;
  `

  // 애니메이션 스타일 추가
  if (!document.getElementById('selectchatgpt-toast-style')) {
    const style = document.createElement('style')
    style.id = 'selectchatgpt-toast-style'
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }

  document.body.appendChild(toast)
  currentToast = toast
  return toast
}

function showLoadingToast(message: string) {
  const toast = createToastElement()
  toast.style.background = '#f0f0f0'
  toast.style.color = '#333'
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
    </svg>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    <span>${message}</span>
  `
}

function showSuccessToast(message: string) {
  const toast = createToastElement()
  toast.style.background = '#10a37f'
  toast.style.color = 'white'
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 12l2 2 4-4"/>
      <circle cx="12" cy="12" r="10"/>
    </svg>
    <span style="white-space: pre-line;">${message}</span>
  `

  // 10초 후 자동 닫기
  setTimeout(() => {
    if (currentToast === toast) {
      hideToast()
    }
  }, 10000)
}

function showErrorToast(message: string) {
  const toast = createToastElement()
  toast.style.background = '#ef4444'
  toast.style.color = 'white'
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4"/>
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
    <span>${message}</span>
    <button class="selectchatgpt-toast-close" style="
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      margin-left: auto;
      opacity: 0.7;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  `

  // 닫기 버튼 이벤트 (Content Script에서는 inline onclick이 동작하지 않음)
  const closeBtn = toast.querySelector('.selectchatgpt-toast-close')
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    hideToast()
  })

  // 에러는 자동으로 닫히지 않음 - 사용자가 직접 닫아야 함
}

function hideToast() {
  if (currentToast) {
    const toastToRemove = currentToast // 삭제할 toast를 로컬 변수로 캡처
    currentToast = null // 즉시 null로 설정하여 새 toast 생성 가능하게 함
    toastToRemove.style.animation = 'slideOut 0.3s ease forwards'
    setTimeout(() => {
      toastToRemove.remove()
    }, 300)
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
