// Content Script for ChatGPT Share Pages
console.log("[SelectChatGPT] Content script loaded!")

// API URL 설정
const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'https://api.selectchatgpt.jiun.dev'

// 전역 상태
let checkboxOverlay: HTMLDivElement | null = null
let messageElements: Element[] = []

// ChatGPT 공유 페이지인지 확인
function isChatGPTSharePage(): boolean {
  const url = window.location.href
  return url.includes('chatgpt.com/share/') || url.includes('chat.openai.com/share/')
}

function init() {
  // ChatGPT 공유 페이지가 아니면 실행하지 않음
  if (!isChatGPTSharePage()) {
    console.log("[SelectChatGPT] Not a ChatGPT share page, skipping initialization")
    return
  }

  // 페이지 로드 확인
  console.log("[SelectChatGPT] Initializing on:", window.location.href)

  // 이미 초기화된 경우 정리
  cleanup()

  // React 하이드레이션이 완료될 때까지 대기
  setTimeout(() => {
    createUI()
  }, 2000)
}

function cleanup() {
  document.getElementById("selectchatgpt-floating")?.remove()
  document.getElementById("selectchatgpt-overlay")?.remove()
  // 기존 체크박스들 제거
  document.querySelectorAll('.selectchatgpt-checkbox-wrapper').forEach(el => el.remove())
  checkboxOverlay = null
  messageElements = []
}

function createUI() {
  // 플로팅 버튼 생성
  const floatingButton = document.createElement("div")
  floatingButton.id = "selectchatgpt-floating"
  floatingButton.innerHTML = `
    <button style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10a37f;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
      SelectChatGPT
    </button>
  `
  document.body.appendChild(floatingButton)

  // 메시지 찾기 및 체크박스 직접 삽입 (오버레이 대신)
  createCheckboxes()

  // 버튼 클릭 이벤트
  floatingButton.querySelector("button")?.addEventListener("click", () => {
    const selected = getSelectedMessages()
    if (selected.length === 0) {
      alert("선택된 메시지가 없습니다. 메시지 옆의 체크박스를 클릭하세요.")
      return
    }
    console.log("[SelectChatGPT] Selected messages:", selected)
    createShareLink(selected)
  })
}

function findMessageContainers(): NodeListOf<Element> | Element[] {
  // 여러 가능한 선택자를 시도
  const selectors = [
    '[data-message-author-role]',
    '[data-message-id]',
    'article[data-testid^="conversation-turn"]',
    '[class*="agent-turn"]',
    '[class*="user-turn"]',
    '.text-base[class*="group"]',
    'div[data-testid="conversation-turn-2"]',
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

  // 최후의 방법: 대화 구조 패턴 탐지
  const conversationContainer = document.querySelector('[class*="conversation"], main, [role="main"]')
  if (conversationContainer) {
    // 직접 자식 중 반복되는 구조 찾기
    const children = Array.from(conversationContainer.children)
    const potentialMessages = children.filter(el => {
      const hasText = el.textContent && el.textContent.trim().length > 10
      const hasAvatar = el.querySelector('img, svg, [class*="avatar"]')
      return hasText && hasAvatar
    })
    if (potentialMessages.length > 0) {
      console.log(`[SelectChatGPT] Found messages via pattern matching: ${potentialMessages.length}`)
      return potentialMessages
    }
  }

  return []
}

function detectMessageRole(container: Element): string {
  // 역할 감지 시도
  const role = container.getAttribute('data-message-author-role')
  if (role) return role

  // 클래스명에서 힌트 찾기
  const className = container.className || ''
  if (className.includes('user') || className.includes('human')) return 'user'
  if (className.includes('assistant') || className.includes('agent') || className.includes('gpt')) return 'assistant'

  // data-testid에서 힌트 찾기
  const testId = container.getAttribute('data-testid') || ''
  if (testId.includes('user')) return 'user'
  if (testId.includes('assistant')) return 'assistant'

  // 아바타/아이콘으로 추측
  const hasGPTIcon = container.querySelector('[class*="gpt"], [class*="openai"]')
  if (hasGPTIcon) return 'assistant'

  // 위치 기반 추측 (홀수=user, 짝수=assistant)
  const parent = container.parentElement
  if (parent) {
    const siblings = Array.from(parent.children)
    const index = siblings.indexOf(container)
    return index % 2 === 0 ? 'user' : 'assistant'
  }

  return 'unknown'
}

function createCheckboxes() {
  // ChatGPT 공유 페이지의 메시지 컨테이너 찾기
  const containers = findMessageContainers()
  messageElements = Array.from(containers)

  console.log("[SelectChatGPT] Found message containers:", messageElements.length)

  messageElements.forEach((container, index) => {
    // 이미 체크박스가 있으면 스킵
    if (container.querySelector('.selectchatgpt-checkbox-wrapper')) return

    const role = detectMessageRole(container)
    const htmlContainer = container as HTMLElement

    // 컨테이너의 position이 static이면 relative로 변경
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

    // 클릭 이벤트 전파 방지 (React 간섭 방지)
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation()
    })
    checkboxWrapper.addEventListener('click', (e) => {
      e.stopPropagation()
    })

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

    // role은 반드시 'user' 또는 'assistant'여야 함
    let role = checkbox.dataset.role || detectMessageRole(container)
    if (role !== 'user' && role !== 'assistant') {
      role = 'user' // 기본값
    }

    // 메시지 ID 추출 시도 (data-message-id 등)
    const messageId = container.getAttribute('data-message-id') ||
                      container.getAttribute('data-testid') ||
                      `msg-${index}-${Date.now()}`

    // 콘텐츠 요소 찾기 - 여러 가능한 선택자 시도
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

    // 콘텐츠 요소를 못 찾으면 컨테이너 전체 텍스트 사용
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

    // 클립보드에 복사
    await navigator.clipboard.writeText(data.url)
    alert(`공유 링크가 생성되어 클립보드에 복사되었습니다!\n\n${data.url}`)

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

// SPA 네비게이션 대응 (ChatGPT 페이지에서만)
let lastUrl = location.href
if (isChatGPTSharePage()) {
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      // 페이지가 변경되면 기존 UI 정리
      cleanup()
      // ChatGPT 공유 페이지인 경우에만 다시 초기화
      if (isChatGPTSharePage()) {
        setTimeout(init, 1000)
      }
    }
  }).observe(document.body, { subtree: true, childList: true })
}
