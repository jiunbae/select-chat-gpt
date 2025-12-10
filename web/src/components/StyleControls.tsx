'use client';

import { useState } from 'react';
import { useStyleContext } from './StyleContext';
import type { LetterSpacing, LineHeight, FontSize, MessageGap, ContentPadding } from '@/lib/export';

// Chevron icon component
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
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
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[100px]"
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
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
      />
    </label>
  );
}

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

  // Collapsible sections state
  const [textStyleOpen, setTextStyleOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Style Type Selector - Always visible */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Style:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setStyleType('chatgpt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                styleType === 'chatgpt'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <div className="w-3 h-3 rounded bg-[#212121]" />
              ChatGPT
            </button>
            <button
              onClick={() => setStyleType('clean')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                styleType === 'clean'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <div className="w-3 h-3 rounded bg-white border border-gray-300" />
              Clean
            </button>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-2">
          {/* Text Styling */}
          <CollapsibleSection
            title="Text Styling"
            isOpen={textStyleOpen}
            onToggle={() => setTextStyleOpen(!textStyleOpen)}
          >
            <SelectControl
              label="Font Size"
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
              label="Line Height"
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
              label="Letter Spacing"
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
          </CollapsibleSection>

          {/* Spacing */}
          <CollapsibleSection
            title="Spacing"
            isOpen={spacingOpen}
            onToggle={() => setSpacingOpen(!spacingOpen)}
          >
            <SelectControl
              label="Message Gap"
              value={messageGap}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small (8px)' },
                { value: 'md', label: 'Medium (16px)' },
                { value: 'lg', label: 'Large (24px)' },
                { value: 'xl', label: 'Extra Large (32px)' },
              ]}
              onChange={(v) => setMessageGap(v as MessageGap)}
            />
            <SelectControl
              label="Content Padding"
              value={contentPadding}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small (8px)' },
                { value: 'md', label: 'Medium (16px)' },
                { value: 'lg', label: 'Large (24px)' },
                { value: 'xl', label: 'Extra Large (32px)' },
              ]}
              onChange={(v) => setContentPadding(v as ContentPadding)}
            />
          </CollapsibleSection>

          {/* Content Filters */}
          <CollapsibleSection
            title="Content Filters"
            isOpen={contentOpen}
            onToggle={() => setContentOpen(!contentOpen)}
          >
            <CheckboxControl
              label="Hide user questions"
              checked={hideUserMessages}
              onChange={setHideUserMessages}
            />
            <CheckboxControl
              label="Hide code blocks"
              checked={hideCodeBlocks}
              onChange={setHideCodeBlocks}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
