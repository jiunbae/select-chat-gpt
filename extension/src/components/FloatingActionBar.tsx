import { useEffect, useState } from "react"
import { t } from "~src/utils/i18n"
import { SearchBar, type RoleFilter } from "./SearchBar"
import { getUsageData, incrementUsage, resetIfNewMonth, MONTHLY_LIMIT } from "~src/utils/usage-limit"

interface FloatingActionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onCreateShare: () => void
  // 검색/필터 관련 props
  searchQuery: string
  onSearchChange: (query: string) => void
  roleFilter: RoleFilter
  onRoleFilterChange: (role: RoleFilter) => void
  codeOnly: boolean
  onCodeOnlyChange: (codeOnly: boolean) => void
  matchedCount: number
  onSelectLastN: (n: number) => void
  onClearFilters: () => void
}

export function FloatingActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onCreateShare,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  codeOnly,
  onCodeOnlyChange,
  matchedCount,
  onSelectLastN,
  onClearFilters,
}: FloatingActionBarProps) {
  const [usage, setUsage] = useState(() => {
    resetIfNewMonth()
    return getUsageData()
  })

  useEffect(() => {
    resetIfNewMonth()
    setUsage(getUsageData())
  }, [])

  const isAllSelected = selectedCount === totalCount && totalCount > 0
  const remainingUsage = Math.max(MONTHLY_LIMIT - usage.count, 0)
  const limitReached = remainingUsage <= 0
  const isShareDisabled = selectedCount === 0 || limitReached

  const handleCreateShare = async () => {
    resetIfNewMonth()
    const latestUsage = getUsageData()

    if (latestUsage.count >= MONTHLY_LIMIT || selectedCount === 0) {
      setUsage(latestUsage)
      return
    }

    try {
      await Promise.resolve(onCreateShare())
      incrementUsage()
      setUsage(getUsageData())
    } catch (error) {
      console.error('[SelectChatGPT] Failed to create share link', error)
    }
  }

  return (
    <div className="scgpt-fixed scgpt-bottom-6 scgpt-left-1/2 scgpt-transform scgpt--translate-x-1/2 scgpt-z-[10000]">
      <div className="scgpt-bg-white scgpt-rounded-2xl scgpt-shadow-2xl scgpt-border scgpt-border-gray-200 scgpt-px-4 scgpt-py-3 scgpt-flex scgpt-items-center scgpt-gap-3">
        {/* 검색/필터 영역 */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          roleFilter={roleFilter}
          onRoleFilterChange={onRoleFilterChange}
          codeOnly={codeOnly}
          onCodeOnlyChange={onCodeOnlyChange}
          totalCount={totalCount}
          matchedCount={matchedCount}
          onSelectLastN={onSelectLastN}
          onClearFilters={onClearFilters}
        />

        <div className="scgpt-h-6 scgpt-w-px scgpt-bg-gray-200" />

        {/* 선택 카운터 */}
        <span className="scgpt-text-sm scgpt-text-gray-600 scgpt-font-medium scgpt-min-w-[100px]">
          {t('selected', [String(selectedCount), String(totalCount)])}
        </span>

        <div className="scgpt-h-6 scgpt-w-px scgpt-bg-gray-200" />

        {/* 선택 버튼들 */}
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

        {/* 사용량 표시 */}
        <div className="scgpt-flex scgpt-flex-col scgpt-items-end scgpt-gap-1 scgpt-min-w-[150px]">
          <span className="scgpt-text-xs scgpt-text-gray-500 scgpt-font-medium">
            {t('usageRemaining', [String(remainingUsage), String(MONTHLY_LIMIT)])}
          </span>
          {limitReached && (
            <span className="scgpt-text-xs scgpt-text-red-500 scgpt-font-medium">
              {t('usageLimitReached')}
            </span>
          )}
        </div>

        {/* 공유 버튼 */}
        <button
          onClick={handleCreateShare}
          disabled={isShareDisabled}
          className={`scgpt-px-4 scgpt-py-2 scgpt-bg-primary scgpt-text-white scgpt-rounded-full scgpt-text-sm scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-flex scgpt-items-center scgpt-gap-2 ${
            isShareDisabled ? 'scgpt-opacity-50 scgpt-cursor-not-allowed' : ''
          }`}
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
