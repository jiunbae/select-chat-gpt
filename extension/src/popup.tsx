import { useEffect } from "react"
import "~style.css"
import { Analytics } from "~src/utils/analytics"

function IndexPopup() {
  useEffect(() => {
    // Track popup opened
    Analytics.popupOpened()
  }, [])

  const handleOpenChatGPT = () => {
    chrome.tabs.create({ url: 'https://chatgpt.com' })
  }

  return (
    <div className="scgpt-w-72 scgpt-p-4 scgpt-bg-white">
      <div className="scgpt-flex scgpt-items-center scgpt-gap-3 scgpt-mb-4">
        <div className="scgpt-w-10 scgpt-h-10 scgpt-bg-primary scgpt-rounded-lg scgpt-flex scgpt-items-center scgpt-justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <h1 className="scgpt-text-lg scgpt-font-bold scgpt-text-gray-900">SelectChatGPT</h1>
          <p className="scgpt-text-xs scgpt-text-gray-500">Share selected messages</p>
        </div>
      </div>

      <div className="scgpt-bg-gray-50 scgpt-rounded-lg scgpt-p-3 scgpt-mb-4">
        <h2 className="scgpt-text-sm scgpt-font-medium scgpt-text-gray-700 scgpt-mb-2">How to use</h2>
        <ol className="scgpt-text-xs scgpt-text-gray-600 scgpt-space-y-1 scgpt-list-decimal scgpt-list-inside">
          <li>Open a ChatGPT shared conversation</li>
          <li>Click checkboxes to select messages</li>
          <li>Click "Create Share Link"</li>
        </ol>
      </div>

      <button
        onClick={handleOpenChatGPT}
        className="scgpt-w-full scgpt-py-2 scgpt-bg-primary scgpt-text-white scgpt-rounded-lg scgpt-text-sm scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors"
      >
        Open ChatGPT
      </button>

      <div className="scgpt-mt-3 scgpt-text-center">
        <a
          href="https://github.com/selectchatgpt"
          target="_blank"
          rel="noopener noreferrer"
          className="scgpt-text-xs scgpt-text-gray-400 scgpt-hover:text-gray-600"
        >
          v0.0.1
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
