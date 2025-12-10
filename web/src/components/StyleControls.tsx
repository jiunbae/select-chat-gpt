'use client';

import { useState } from 'react';
import { useStyleContext } from './StyleContext';
import type { LetterSpacing, LineHeight, FontSize, MessageGap, ContentPadding } from '@/lib/export';

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
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
        isOpen
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
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
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}

type OpenSection = 'text' | 'spacing' | 'filters' | null;

export function StyleControls() {
  const {
    styleType,
    setStyleType,
    letterSpacing,
    setLetterSpacing,
    lineHeight,
    setLineHeight,
    fontSize,
    setFontSize,
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

  const toggleSection = (section: OpenSection) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* All controls in one row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Style Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Style:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setStyleType('chatgpt')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                  styleType === 'chatgpt'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded bg-[#212121]" />
                ChatGPT
              </button>
              <button
                onClick={() => setStyleType('clean')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                  styleType === 'clean'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded bg-white border border-gray-300" />
                Clean
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Dropdown Toggles */}
          <DropdownToggle
            label="Text"
            isOpen={openSection === 'text'}
            onToggle={() => toggleSection('text')}
          />
          <DropdownToggle
            label="Spacing"
            isOpen={openSection === 'spacing'}
            onToggle={() => toggleSection('spacing')}
          />
          <DropdownToggle
            label="Filters"
            isOpen={openSection === 'filters'}
            onToggle={() => toggleSection('filters')}
          />
        </div>

        {/* Expanded Section Content */}
        {openSection && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {openSection === 'text' && (
              <div className="flex flex-wrap items-center gap-4">
                <SelectControl
                  label="Font"
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
                />
                <SelectControl
                  label="Line"
                  value={lineHeight}
                  options={[
                    { value: 'tight', label: '1.25' },
                    { value: 'snug', label: '1.375' },
                    { value: 'normal', label: '1.5' },
                    { value: 'relaxed', label: '1.625' },
                    { value: 'loose', label: '2.0' },
                  ]}
                  onChange={(v) => setLineHeight(v as LineHeight)}
                />
                <SelectControl
                  label="Letter"
                  value={letterSpacing}
                  options={[
                    { value: 'tighter', label: '-0.05em' },
                    { value: 'tight', label: '-0.025em' },
                    { value: 'normal', label: '0' },
                    { value: 'wide', label: '0.025em' },
                    { value: 'wider', label: '0.05em' },
                  ]}
                  onChange={(v) => setLetterSpacing(v as LetterSpacing)}
                />
              </div>
            )}

            {openSection === 'spacing' && (
              <div className="flex flex-wrap items-center gap-4">
                <SelectControl
                  label="Gap"
                  value={messageGap}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm', label: '8px' },
                    { value: 'md', label: '16px' },
                    { value: 'lg', label: '24px' },
                    { value: 'xl', label: '32px' },
                  ]}
                  onChange={(v) => setMessageGap(v as MessageGap)}
                />
                <SelectControl
                  label="Padding"
                  value={contentPadding}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm', label: '8px' },
                    { value: 'md', label: '16px' },
                    { value: 'lg', label: '24px' },
                    { value: 'xl', label: '32px' },
                  ]}
                  onChange={(v) => setContentPadding(v as ContentPadding)}
                />
              </div>
            )}

            {openSection === 'filters' && (
              <div className="flex flex-wrap items-center gap-4">
                <CheckboxControl
                  label="Hide questions"
                  checked={hideUserMessages}
                  onChange={setHideUserMessages}
                />
                <CheckboxControl
                  label="Hide code"
                  checked={hideCodeBlocks}
                  onChange={setHideCodeBlocks}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
