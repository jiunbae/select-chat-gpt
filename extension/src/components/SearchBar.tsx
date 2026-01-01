import { useState, useRef, useEffect } from "react"
import { t } from "~src/utils/i18n"

export type RoleFilter = "all" | "user" | "assistant"

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  roleFilter: RoleFilter
  onRoleFilterChange: (role: RoleFilter) => void
  codeOnly: boolean
  onCodeOnlyChange: (codeOnly: boolean) => void
  totalCount: number
  matchedCount: number
  onSelectLastN: (n: number) => void
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  codeOnly,
  onCodeOnlyChange,
  totalCount,
  matchedCount,
  onSelectLastN,
}: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showLastNDropdown, setShowLastNDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 드롭다운 외부 클릭시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLastNDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasActiveFilters = searchQuery.length > 0 || roleFilter !== "all" || codeOnly

  return (
    <div className="scgpt-flex scgpt-items-center scgpt-gap-2">
      {/* 검색/필터 토글 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`scgpt-p-2 scgpt-rounded-md scgpt-transition-colors ${
          isExpanded || hasActiveFilters
            ? "scgpt-bg-primary/10 scgpt-text-primary"
            : "scgpt-text-gray-500 scgpt-hover:bg-gray-100"
        }`}
        title={t("searchFilter") || "Search & Filter"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        {hasActiveFilters && !isExpanded && (
          <span className="scgpt-absolute scgpt--top-1 scgpt--right-1 scgpt-w-2 scgpt-h-2 scgpt-bg-primary scgpt-rounded-full" />
        )}
      </button>

      {/* 확장된 검색/필터 패널 */}
      {isExpanded && (
        <div className="scgpt-flex scgpt-items-center scgpt-gap-3 scgpt-animate-in scgpt-slide-in-from-left">
          {/* 검색 입력창 */}
          <div className="scgpt-relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder") || "Search messages..."}
              className="scgpt-w-48 scgpt-pl-3 scgpt-pr-8 scgpt-py-1.5 scgpt-text-sm scgpt-border scgpt-border-gray-200 scgpt-rounded-md scgpt-bg-white scgpt-text-gray-900 scgpt-focus:outline-none scgpt-focus:border-primary scgpt-focus:ring-1 scgpt-focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="scgpt-absolute scgpt-right-2 scgpt-top-1/2 scgpt--translate-y-1/2 scgpt-text-gray-400 scgpt-hover:text-gray-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* 역할 필터 */}
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as RoleFilter)}
            className="scgpt-px-2 scgpt-py-1.5 scgpt-text-sm scgpt-border scgpt-border-gray-200 scgpt-rounded-md scgpt-bg-white scgpt-text-gray-700 scgpt-cursor-pointer"
          >
            <option value="all">{t("filterAll") || "All roles"}</option>
            <option value="user">{t("filterUser") || "User only"}</option>
            <option value="assistant">{t("filterAssistant") || "Assistant only"}</option>
          </select>

          {/* 코드 포함 필터 */}
          <label className="scgpt-flex scgpt-items-center scgpt-gap-1.5 scgpt-text-sm scgpt-text-gray-600 scgpt-cursor-pointer scgpt-whitespace-nowrap">
            <input
              type="checkbox"
              checked={codeOnly}
              onChange={(e) => onCodeOnlyChange(e.target.checked)}
              className="scgpt-w-4 scgpt-h-4 scgpt-rounded scgpt-border-gray-300 scgpt-accent-primary"
            />
            {t("codeOnly") || "Code only"}
          </label>

          {/* 마지막 N개 선택 드롭다운 */}
          <div className="scgpt-relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLastNDropdown(!showLastNDropdown)}
              className="scgpt-px-3 scgpt-py-1.5 scgpt-text-sm scgpt-text-gray-700 scgpt-hover:bg-gray-100 scgpt-rounded-md scgpt-transition-colors scgpt-flex scgpt-items-center scgpt-gap-1"
            >
              {t("selectLastN") || "Last N"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showLastNDropdown && (
              <div className="scgpt-absolute scgpt-top-full scgpt-left-0 scgpt-mt-1 scgpt-bg-white scgpt-border scgpt-border-gray-200 scgpt-rounded-md scgpt-shadow-lg scgpt-py-1 scgpt-z-10 scgpt-min-w-[100px]">
                {[5, 10, 20, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      onSelectLastN(n)
                      setShowLastNDropdown(false)
                    }}
                    disabled={n > totalCount}
                    className="scgpt-w-full scgpt-px-3 scgpt-py-1.5 scgpt-text-left scgpt-text-sm scgpt-text-gray-700 scgpt-hover:bg-gray-100 scgpt-disabled:opacity-50 scgpt-disabled:cursor-not-allowed"
                  >
                    {t("lastNMessages", [String(n)]) || `Last ${n}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 필터 결과 표시 */}
          {hasActiveFilters && (
            <span className="scgpt-text-xs scgpt-text-gray-500 scgpt-whitespace-nowrap">
              {t("matchedCount", [String(matchedCount), String(totalCount)]) || `${matchedCount}/${totalCount} matched`}
            </span>
          )}

          {/* 필터 초기화 */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                onSearchChange("")
                onRoleFilterChange("all")
                onCodeOnlyChange(false)
              }}
              className="scgpt-p-1.5 scgpt-text-gray-400 scgpt-hover:text-gray-600 scgpt-hover:bg-gray-100 scgpt-rounded"
              title={t("clearFilters") || "Clear filters"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
