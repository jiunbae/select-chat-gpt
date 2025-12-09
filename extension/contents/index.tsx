import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/share/*"],
  run_at: "document_idle"
}

// 간단한 테스트용 컴포넌트
const SelectChatGPTOverlay = () => {
  console.log("[SelectChatGPT] Content script loaded!")

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#10a37f',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      SelectChatGPT 로드됨!
    </div>
  )
}

export default SelectChatGPTOverlay
