import { useTranslation } from 'react-i18next'

export function useLocaleText() {
  const { i18n } = useTranslation()
  const isEnglish = i18n.resolvedLanguage?.startsWith('en') ?? false
  return {
    isEnglish,
    locale: isEnglish ? 'en-US' : 'zh-CN',
    text: (chinese: string, english: string) => (isEnglish ? english : chinese),
  }
}
