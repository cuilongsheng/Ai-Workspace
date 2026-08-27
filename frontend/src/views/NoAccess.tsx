import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useSessionStore } from '../store/session-store'

export function NoAccess() {
  const { t } = useTranslation()
  const logout = useSessionStore((state) => state.logout)

  return (
    <main className="relative grid min-h-screen place-items-center bg-slate-50 px-6 py-10 text-slate-900">
      <div className="absolute right-6 top-6">
        <LanguageSwitcher />
      </div>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert size={27} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {t('errors.noAccess')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {t('errors.noAccessDescription')}
        </p>
        <div className="mt-7 border-t border-slate-100 pt-6">
          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            onClick={() => void logout()}
          >
            {t('actions.logout')}
          </button>
        </div>
      </section>
    </main>
  )
}
