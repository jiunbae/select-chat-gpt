'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStyleContext } from './StyleContext';
import type { LetterSpacing, LineHeight, FontSize, FontFamily, MessageGap, ContentPadding } from '@/lib/export';

// Chevron icon component
function ChevronIcon({ isOpen, className = '' }: { isOpen: boolean; className?: string }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// Dropdown toggle button
function DropdownToggle({
  label,
  isOpen,
  onToggle,
  isCleanStyle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  isCleanStyle: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors"
      style={{
        borderColor: isOpen ? '#10a37f' : (isCleanStyle ? '#e5e7eb' : '#444444'),
        backgroundColor: isOpen ? 'rgba(16, 163, 127, 0.1)' : 'transparent',
        color: isOpen ? '#10a37f' : (isCleanStyle ? '#6b7280' : '#9ca3af'),
      }}
    >
      {label}
      <ChevronIcon isOpen={isOpen} />
    </button>
  );
}

// Select control component
function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
  isCleanStyle,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  isCleanStyle: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        className="text-sm whitespace-nowrap"
        style={{ color: isCleanStyle ? '#6b7280' : '#9ca3af' }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="px-2 py-1 text-sm border rounded-md"
        style={{
          borderColor: isCleanStyle ? '#e5e7eb' : '#444444',
          backgroundColor: isCleanStyle ? '#ffffff' : '#2a2a2a',
          color: isCleanStyle ? '#1f2937' : '#ffffff',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Checkbox control component
function CheckboxControl({
  label,
  checked,
  onChange,
  isCleanStyle,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isCleanStyle: boolean;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
      style={{ color: isCleanStyle ? '#6b7280' : '#9ca3af' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded text-primary focus:ring-primary"
        style={{ borderColor: isCleanStyle ? '#d1d5db' : '#444444' }}
      />
      {label}
    </label>
  );
}

type OpenSection = 'text' | 'spacing' | 'filters' | null;

export function StyleControls() {
  const t = useTranslations('styleControls');
  const {
    styleType,
    setStyleType,
    letterSpacing,
    setLetterSpacing,
    lineHeight,
    setLineHeight,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    messageGap,
    setMessageGap,
    contentPadding,
    setContentPadding,
    hideUserMessages,
    setHideUserMessages,
    hideCodeBlocks,
    setHideCodeBlocks,
  } = useStyleContext();

  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const isCleanStyle = styleType === 'clean';

  const toggleSection = (section: OpenSection) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div
      className="border-b transition-colors"
      style={{
        backgroundColor: isCleanStyle ? '#f9fafb' : '#1a1a1a',
        borderColor: isCleanStyle ? '#e5e7eb' : '#444444',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* All controls in one row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Style Type */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: isCleanStyle ? '#374151' : '#d1d5db' }}
            >
              {t('style')}:
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setStyleType('chatgpt')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-colors"
                style={{
                  borderColor: styleType === 'chatgpt' ? '#10a37f' : (isCleanStyle ? '#e5e7eb' : '#444444'),
                  backgroundColor: styleType === 'chatgpt' ? 'rgba(16, 163, 127, 0.1)' : 'transparent',
                  color: styleType === 'chatgpt' ? '#10a37f' : (isCleanStyle ? '#6b7280' : '#9ca3af'),
                }}
              >
                <div className="w-2.5 h-2.5 rounded bg-[#212121]" />
                {t('chatgpt')}
              </button>
              <button
                onClick={() => setStyleType('clean')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-colors"
                style={{
                  borderColor: styleType === 'clean' ? '#10a37f' : (isCleanStyle ? '#e5e7eb' : '#444444'),
                  backgroundColor: styleType === 'clean' ? 'rgba(16, 163, 127, 0.1)' : 'transparent',
                  color: styleType === 'clean' ? '#10a37f' : (isCleanStyle ? '#6b7280' : '#9ca3af'),
                }}
              >
                <div className="w-2.5 h-2.5 rounded bg-white border border-gray-300" />
                {t('clean')}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div
            className="h-6 w-px"
            style={{ backgroundColor: isCleanStyle ? '#d1d5db' : '#444444' }}
          />

          {/* Dropdown Toggles */}
          <DropdownToggle
            label={t('text')}
            isOpen={openSection === 'text'}
            onToggle={() => toggleSection('text')}
            isCleanStyle={isCleanStyle}
          />
          <DropdownToggle
            label={t('spacing')}
            isOpen={openSection === 'spacing'}
            onToggle={() => toggleSection('spacing')}
            isCleanStyle={isCleanStyle}
          />
          <DropdownToggle
            label={t('filters')}
            isOpen={openSection === 'filters'}
            onToggle={() => toggleSection('filters')}
            isCleanStyle={isCleanStyle}
          />
        </div>

        {/* Expanded Section Content */}
        {openSection && (
          <div
            className="mt-3 pt-3 border-t"
            style={{ borderColor: isCleanStyle ? '#e5e7eb' : '#444444' }}
          >
            {openSection === 'text' && (
              <div className="flex flex-wrap items-center gap-4">
                <SelectControl
                  label={t('font')}
                  value={fontFamily}
                  options={[
                    { value: 'pretendard', label: 'Pretendard' },
                    { value: 'noto-sans-kr', label: 'Noto Sans KR' },
                    { value: 'noto-serif-kr', label: 'Noto Serif KR' },
                    { value: 'ibm-plex-sans-kr', label: 'IBM Plex Sans KR' },
                    { value: 'system', label: t('systemDefault') },
                  ]}
                  onChange={(v) => setFontFamily(v as FontFamily)}
                  isCleanStyle={isCleanStyle}
                />
                <SelectControl
                  label={t('fontSize')}
                  value={fontSize}
                  options={[
                    { value: 'xs', label: '12px' },
                    { value: 'sm', label: '14px' },
                    { value: 'base', label: '16px' },
                    { value: 'lg', label: '18px' },
                    { value: 'xl', label: '20px' },
                    { value: '2xl', label: '24px' },
                  ]}
                  onChange={(v) => setFontSize(v as FontSize)}
                  isCleanStyle={isCleanStyle}
                />
                <SelectControl
                  label={t('lineHeight')}
                  value={lineHeight}
                  options={[
                    { value: 'tight', label: '1.25' },
                    { value: 'snug', label: '1.375' },
                    { value: 'normal', label: '1.5' },
                    { value: 'relaxed', label: '1.625' },
                    { value: 'loose', label: '2.0' },
                  ]}
                  onChange={(v) => setLineHeight(v as LineHeight)}
                  isCleanStyle={isCleanStyle}
                />
                <SelectControl
                  label={t('letterSpacing')}
                  value={letterSpacing}
                  options={[
                    { value: 'tighter', label: '-0.05em' },
                    { value: 'tight', label: '-0.025em' },
                    { value: 'normal', label: '0' },
                    { value: 'wide', label: '0.025em' },
                    { value: 'wider', label: '0.05em' },
                  ]}
                  onChange={(v) => setLetterSpacing(v as LetterSpacing)}
                  isCleanStyle={isCleanStyle}
                />
              </div>
            )}

            {openSection === 'spacing' && (
              <div className="flex flex-wrap items-center gap-4">
                <SelectControl
                  label={t('gap')}
                  value={messageGap}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm', label: '8px' },
                    { value: 'md', label: '16px' },
                    { value: 'lg', label: '24px' },
                    { value: 'xl', label: '32px' },
                  ]}
                  onChange={(v) => setMessageGap(v as MessageGap)}
                  isCleanStyle={isCleanStyle}
                />
                <SelectControl
                  label={t('padding')}
                  value={contentPadding}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm', label: '8px' },
                    { value: 'md', label: '16px' },
                    { value: 'lg', label: '24px' },
                    { value: 'xl', label: '32px' },
                  ]}
                  onChange={(v) => setContentPadding(v as ContentPadding)}
                  isCleanStyle={isCleanStyle}
                />
              </div>
            )}

            {openSection === 'filters' && (
              <div className="flex flex-wrap items-center gap-4">
                <CheckboxControl
                  label={t('hideQuestions')}
                  checked={hideUserMessages}
                  onChange={setHideUserMessages}
                  isCleanStyle={isCleanStyle}
                />
                <CheckboxControl
                  label={t('hideCode')}
                  checked={hideCodeBlocks}
                  onChange={setHideCodeBlocks}
                  isCleanStyle={isCleanStyle}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
