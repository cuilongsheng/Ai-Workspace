import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FeedbackState } from '../components/feedback/FeedbackState'

export function FeatureUnavailable() {
  const { t } = useTranslation()
  return (
    <FeedbackState
      title={t('foundation.unavailable')}
      description={t('foundation.description')}
      action={<Construction className="state-icon" aria-hidden="true" />}
    />
  )
}
