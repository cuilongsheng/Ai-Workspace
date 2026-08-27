import { Dropdown } from '@heroui/react'
import { Languages } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'zh-CN'
  const [pendingLanguage, setPendingLanguage] = useState(language)
  const [open, setOpen] = useState(false)
  const zh = language === 'zh-CN'

  return (
    <Dropdown
      isOpen={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setPendingLanguage(language)
      }}
    >
      <Dropdown.Trigger
        aria-label={t('language.switch')}
        className={`flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-600 ${compact ? 'h-8 w-10' : 'h-9 px-3'}`}
      >
        <Languages size={15} />
        {compact ? null : language === 'zh-CN' ? '中文' : 'English'}
      </Dropdown.Trigger>
      <Dropdown.Popover className="w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {zh ? '选择语言' : 'Choose language'}
          </h2>
          <div className="mt-3 grid gap-2">
            {[
              ['zh-CN', '中文'],
              ['en-US', 'English'],
            ].map(([value, label]) => (
              <label
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${pendingLanguage === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700'}`}
                key={value}
              >
                <input
                  checked={pendingLanguage === value}
                  name="workspace-language"
                  onChange={() => setPendingLanguage(value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
              onClick={() => setOpen(false)}
              type="button"
            >
              {zh ? '取消' : 'Cancel'}
            </button>
            <button
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white"
              onClick={() => {
                void i18n.changeLanguage(pendingLanguage)
                setOpen(false)
              }}
              type="button"
            >
              {zh ? '确认' : 'Confirm'}
            </button>
          </div>
        </div>
      </Dropdown.Popover>
    </Dropdown>
  )
}
