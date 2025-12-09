import { useEffect, useRef } from "react"
import type { ChatMessage } from "~src/types"

interface MessageSelectorProps {
  messages: ChatMessage[]
  selectedIds: Set<string>
  onToggleSelect: (id: string, index: number, shiftKey: boolean) => void
}

const MESSAGE_SELECTORS = [
  '[data-message-author-role]',
  'article[data-testid^="conversation-turn"]',
  '[class*="ConversationItem"]',
  '.group\\/conversation-turn',
  'article'
]

function findMessageElements(): HTMLElement[] {
  for (const selector of MESSAGE_SELECTORS) {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector)
      if (elements.length > 0) {
        return Array.from(elements)
      }
    } catch (e) {
      continue
    }
  }
  return []
}

export function MessageSelector({ messages, selectedIds, onToggleSelect }: MessageSelectorProps) {
  const checkboxRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const elements = findMessageElements()

    elements.forEach((element, index) => {
      if (index >= messages.length) return

      const message = messages[index]
      let checkbox = checkboxRefs.current.get(message.id)

      if (!checkbox) {
        checkbox = document.createElement('div')
        checkbox.className = 'select-chatgpt-checkbox'
        checkbox.setAttribute('data-message-id', message.id)
        checkbox.style.cssText = `
          position: absolute;
          left: -40px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid #10a37f;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          z-index: 1000;
        `

        const parent = element.parentElement
        if (parent) {
          parent.style.position = 'relative'
        }

        element.style.position = 'relative'
        element.insertBefore(checkbox, element.firstChild)
        checkboxRefs.current.set(message.id, checkbox)
      }

      const isSelected = selectedIds.has(message.id)
      checkbox.innerHTML = isSelected
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10a37f" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>`
        : ''
      checkbox.style.background = isSelected ? '#e6f7f2' : 'white'

      const handleClick = (e: MouseEvent) => {
        e.stopPropagation()
        onToggleSelect(message.id, index, e.shiftKey)
      }

      checkbox.onclick = handleClick
    })

    return () => {
      checkboxRefs.current.forEach((checkbox) => {
        checkbox.remove()
      })
      checkboxRefs.current.clear()
    }
  }, [messages, selectedIds, onToggleSelect])

  return null
}
