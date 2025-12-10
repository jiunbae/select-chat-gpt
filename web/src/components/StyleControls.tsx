'use client';

import { useStyleContext } from './StyleContext';
import type { LetterSpacing, LineHeight, FontSize } from '@/lib/export';

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
    hideUserMessages,
    setHideUserMessages,
    hideCodeBlocks,
    setHideCodeBlocks,
  } = useStyleContext();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Style Type Selector */}
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

        {/* Text Styling Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <SelectControl
            label="Font Size"
            value={fontSize}
            options={[
              { value: 'small', label: '14px' },
              { value: 'medium', label: '16px' },
              { value: 'large', label: '18px' },
            ]}
            onChange={(v) => setFontSize(v as FontSize)}
          />
          <SelectControl
            label="Line Height"
            value={lineHeight}
            options={[
              { value: 'compact', label: '1.4' },
              { value: 'normal', label: '1.75' },
              { value: 'relaxed', label: '2.0' },
            ]}
            onChange={(v) => setLineHeight(v as LineHeight)}
          />
          <SelectControl
            label="Letter Spacing"
            value={letterSpacing}
            options={[
              { value: 'tight', label: '-0.5px' },
              { value: 'normal', label: '0' },
              { value: 'wide', label: '1px' },
            ]}
            onChange={(v) => setLetterSpacing(v as LetterSpacing)}
          />
        </div>

        {/* Content Filters */}
        <div className="flex flex-wrap items-center gap-4">
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
        </div>
      </div>
    </div>
  );
}

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
      <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
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
    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
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
