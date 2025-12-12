import { t } from "~src/utils/i18n"

interface FloatingActionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onCreateShare: () => void
}

export function FloatingActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onCreateShare
}: FloatingActionBarProps) {
  const isAllSelected = selectedCount === totalCount

  return (
    <div className="scgpt-fixed scgpt-bottom-6 scgpt-left-1/2 scgpt-transform scgpt--translate-x-1/2 scgpt-z-[10000]">
      <div className="scgpt-bg-white scgpt-rounded-full scgpt-shadow-2xl scgpt-border scgpt-border-gray-200 scgpt-px-4 scgpt-py-3 scgpt-flex scgpt-items-center scgpt-gap-4">
        <span className="scgpt-text-sm scgpt-text-gray-600 scgpt-font-medium scgpt-min-w-[100px]">
          {t('selected', [String(selectedCount), String(totalCount)])}
        </span>

        <div className="scgpt-h-6 scgpt-w-px scgpt-bg-gray-200" />

        <button
          onClick={onSelectAll}
          className="scgpt-px-3 scgpt-py-1.5 scgpt-text-sm scgpt-text-gray-700 scgpt-hover:bg-gray-100 scgpt-rounded-md scgpt-transition-colors"
        >
          {isAllSelected ? t('deselectAll') : t('selectAll')}
        </button>

        <button
          onClick={onClearSelection}
          className="scgpt-px-3 scgpt-py-1.5 scgpt-text-sm scgpt-text-gray-700 scgpt-hover:bg-gray-100 scgpt-rounded-md scgpt-transition-colors"
        >
          {t('clear')}
        </button>

        <div className="scgpt-h-6 scgpt-w-px scgpt-bg-gray-200" />

        <button
          onClick={onCreateShare}
          className="scgpt-px-4 scgpt-py-2 scgpt-bg-primary scgpt-text-white scgpt-rounded-full scgpt-text-sm scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-flex scgpt-items-center scgpt-gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {t('createShareLink')}
        </button>
      </div>
    </div>
  )
}
