import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FeedbackState } from '../components/feedback/FeedbackState'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="centered-state">
      <FeedbackState
        title="404"
        description={t('errors.notFound')}
        action={
          <Link className="primary-action" to="/workspace">
            {t('actions.backHome')}
          </Link>
        }
      />
    </main>
  )
}
