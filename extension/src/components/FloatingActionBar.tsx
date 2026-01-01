import { t } from "~src/utils/i18n"
import { SearchBar, type RoleFilter } from "./SearchBar"

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
  const isAllSelected = selectedCount === totalCount && totalCount > 0

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

        {/* 공유 버튼 */}
        <button
          onClick={onCreateShare}
          disabled={selectedCount === 0}
          className="scgpt-px-4 scgpt-py-2 scgpt-bg-primary scgpt-text-white scgpt-rounded-full scgpt-text-sm scgpt-font-medium scgpt-hover:bg-primary-hover scgpt-transition-colors scgpt-flex scgpt-items-center scgpt-gap-2 scgpt-disabled:opacity-50 scgpt-disabled:cursor-not-allowed"
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
