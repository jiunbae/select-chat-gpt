import type { ChatMessage, ExportStyleType } from "~src/types"

export interface ExportStyle {
  container: Partial<CSSStyleDeclaration>
  header: Partial<CSSStyleDeclaration>
  messageWrapper: Partial<CSSStyleDeclaration>
  userMessage: Partial<CSSStyleDeclaration>
  assistantMessage: Partial<CSSStyleDeclaration>
  roleLabel: Partial<CSSStyleDeclaration>
  content: Partial<CSSStyleDeclaration>
  codeBlock: Partial<CSSStyleDeclaration>
  inlineCode: Partial<CSSStyleDeclaration>
}

export function getChatGPTStyle(): ExportStyle {
  return {
    container: {
      backgroundColor: '#212121',
      color: '#ececf1',
      fontFamily: '"Söhne", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '32px',
      minWidth: '600px',
      maxWidth: '800px',
      boxSizing: 'border-box',
    },
    header: {
      fontSize: '24px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#ececf1',
    },
    messageWrapper: {
      padding: '24px 0',
      borderBottom: '1px solid #444654',
    },
    userMessage: {
      backgroundColor: 'transparent',
    },
    assistantMessage: {
      backgroundColor: 'transparent',
    },
    roleLabel: {
      fontWeight: '600',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#ececf1',
    },
    content: {
      fontSize: '16px',
      lineHeight: '1.75',
      color: '#d1d5db',
    },
    codeBlock: {
      backgroundColor: '#1e1e1e',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: '"Söhne Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '14px',
      overflowX: 'auto',
      margin: '16px 0',
      color: '#e5e5e5',
    },
    inlineCode: {
      backgroundColor: '#3c3c3c',
      padding: '2px 6px',
      borderRadius: '4px',
      fontFamily: '"Söhne Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '14px',
      color: '#e5e5e5',
    },
  }
}

export function getCleanDocumentStyle(): ExportStyle {
  return {
    container: {
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      fontFamily: 'Georgia, "Times New Roman", Times, serif',
      padding: '48px 56px',
      minWidth: '600px',
      maxWidth: '800px',
      boxSizing: 'border-box',
    },
    header: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#1a1a1a',
      borderBottom: '2px solid #10a37f',
      paddingBottom: '16px',
    },
    messageWrapper: {
      padding: '20px 0',
      borderBottom: '1px solid #e5e5e5',
    },
    userMessage: {
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px 0',
    },
    assistantMessage: {
      backgroundColor: '#ffffff',
      borderLeft: '4px solid #10a37f',
      paddingLeft: '16px',
      margin: '8px 0',
    },
    roleLabel: {
      fontWeight: '700',
      marginBottom: '12px',
      fontSize: '13px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#6b7280',
    },
    content: {
      fontSize: '16px',
      lineHeight: '1.8',
      color: '#374151',
    },
    codeBlock: {
      backgroundColor: '#f3f4f6',
      borderRadius: '6px',
      padding: '16px',
      fontFamily: '"SF Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '13px',
      overflowX: 'auto',
      margin: '16px 0',
      border: '1px solid #e5e7eb',
      color: '#1f2937',
    },
    inlineCode: {
      backgroundColor: '#f3f4f6',
      padding: '2px 6px',
      borderRadius: '4px',
      fontFamily: '"SF Mono", Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '13px',
      color: '#dc2626',
    },
  }
}

export function getExportStyle(styleType: ExportStyleType): ExportStyle {
  return styleType === 'chatgpt' ? getChatGPTStyle() : getCleanDocumentStyle()
}

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles)
}

function sanitizeHTML(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Remove buttons, copy icons, interactive elements
  temp.querySelectorAll('button, [role="button"], .copy-button, .absolute, svg.icon')
    .forEach(el => el.remove())

  return temp.innerHTML
}

function processCodeBlocks(container: HTMLElement, style: ExportStyle): void {
  // Style pre > code blocks
  container.querySelectorAll('pre').forEach(pre => {
    applyStyles(pre as HTMLElement, style.codeBlock)
    const code = pre.querySelector('code')
    if (code) {
      code.style.backgroundColor = 'transparent'
      code.style.padding = '0'
    }
  })

  // Style inline code (not inside pre)
  container.querySelectorAll('code').forEach(code => {
    if (code.parentElement?.tagName !== 'PRE') {
      applyStyles(code as HTMLElement, style.inlineCode)
    }
  })
}

export function createMessageElement(
  message: ChatMessage,
  style: ExportStyle
): HTMLDivElement {
  const wrapper = document.createElement('div')
  applyStyles(wrapper, style.messageWrapper)

  // Apply role-specific styles
  const roleStyle = message.role === 'user' ? style.userMessage : style.assistantMessage
  applyStyles(wrapper, roleStyle)

  // Role label
  const roleLabel = document.createElement('div')
  roleLabel.textContent = message.role === 'user' ? 'You' : 'ChatGPT'
  applyStyles(roleLabel, style.roleLabel)
  wrapper.appendChild(roleLabel)

  // Content
  const content = document.createElement('div')
  content.innerHTML = sanitizeHTML(message.html)
  applyStyles(content, style.content)

  // Process code blocks inside content
  processCodeBlocks(content, style)

  // Style other elements
  content.querySelectorAll('p').forEach(p => {
    (p as HTMLElement).style.margin = '0 0 16px 0'
  })
  content.querySelectorAll('ul, ol').forEach(list => {
    (list as HTMLElement).style.margin = '0 0 16px 0'
    ;(list as HTMLElement).style.paddingLeft = '24px'
  })
  content.querySelectorAll('li').forEach(li => {
    (li as HTMLElement).style.marginBottom = '8px'
  })
  content.querySelectorAll('a').forEach(a => {
    (a as HTMLElement).style.color = '#10a37f'
    ;(a as HTMLElement).style.textDecoration = 'underline'
  })
  content.querySelectorAll('strong, b').forEach(el => {
    (el as HTMLElement).style.fontWeight = '600'
  })
  content.querySelectorAll('blockquote').forEach(bq => {
    (bq as HTMLElement).style.borderLeft = '3px solid #10a37f'
    ;(bq as HTMLElement).style.paddingLeft = '16px'
    ;(bq as HTMLElement).style.margin = '16px 0'
    ;(bq as HTMLElement).style.fontStyle = 'italic'
    ;(bq as HTMLElement).style.color = '#6b7280'
  })

  wrapper.appendChild(content)

  return wrapper
}

export function createExportableElement(
  messages: ChatMessage[],
  title: string,
  styleType: ExportStyleType
): HTMLDivElement {
  const style = getExportStyle(styleType)

  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  applyStyles(container, style.container)

  // Title
  if (title) {
    const titleEl = document.createElement('h1')
    titleEl.textContent = title
    applyStyles(titleEl, style.header)
    container.appendChild(titleEl)

    // Subtitle with source info
    const subtitle = document.createElement('div')
    subtitle.textContent = `Generated by SelectChatGPT`
    subtitle.style.fontSize = '12px'
    subtitle.style.color = styleType === 'chatgpt' ? '#8e8ea0' : '#9ca3af'
    subtitle.style.marginBottom = '24px'
    container.appendChild(subtitle)
  }

  // Messages
  messages.forEach((message, index) => {
    const msgEl = createMessageElement(message, style)
    if (index === messages.length - 1) {
      msgEl.style.borderBottom = 'none'
    }
    container.appendChild(msgEl)
  })

  return container
}
