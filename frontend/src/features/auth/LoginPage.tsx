import { zodResolver } from '@hookform/resolvers/zod'
import { CircleX, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useSessionStore } from '../../store/session-store'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { toast } from '@heroui/react'

const loginSchema = z.object({
  account: z.string().trim().min(1, 'accountRequired'),
  password: z.string().min(6, 'passwordMin'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const login = useSessionStore((state) => state.login)
  const status = useSessionStore((state) => state.status)
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (status === 'authenticated') return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
    } catch {
      toast.danger(t('login.errorTitle'), {
        description: t('login.error'),
      })
    }
  })

  const passwordError = errors.password?.message

  return (
    <main className="relative grid min-h-screen place-items-center bg-slate-50 px-6 py-10 font-sans text-slate-900">
      <div className="absolute right-6 top-6">
        <LanguageSwitcher />
      </div>
      <form
        className="w-full max-w-[422px] rounded-xl border border-slate-200 bg-white px-10 py-10 shadow-[0_12px_32px_rgba(15,23,42,0.04)]"
        onSubmit={onSubmit}
        noValidate
      >
        <header className="mb-8 text-center">
          <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
            W
          </span>
          <h1 className="text-xl font-bold tracking-[-0.01em]">
            {t('login.title')}
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {t('login.subtitle')}
          </p>
        </header>

        <label
          className="mb-4 grid gap-1.5 text-[13px] font-medium text-slate-600"
          htmlFor="account"
        >
          {t('login.account')}
          <input
            id="account"
            type="text"
            autoComplete="username"
            className={`h-9 rounded-md border bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${errors.account ? 'border-rose-500' : 'border-slate-200'}`}
            aria-invalid={Boolean(errors.account)}
            {...register('account')}
          />
          {errors.account ? (
            <span className="text-xs font-normal text-rose-600">
              {t(`login.${errors.account.message}`)}
            </span>
          ) : null}
        </label>

        <label
          className="grid gap-1.5 text-[13px] font-medium text-slate-600"
          htmlFor="password"
        >
          {t('login.password')}
          <span className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={`h-9 w-full rounded-md border bg-white px-3 pr-10 text-sm font-normal text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${passwordError ? 'border-rose-500' : 'border-slate-200'}`}
              aria-invalid={Boolean(passwordError)}
              {...register('password')}
            />
            <button
              type="button"
              aria-label={
                showPassword ? t('login.hidePassword') : t('login.showPassword')
              }
              title={
                showPassword ? t('login.hidePassword') : t('login.showPassword')
              }
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
          {passwordError ? (
            <span className="text-xs font-normal text-rose-600">
              {t(`login.${passwordError}`)}
            </span>
          ) : null}
        </label>

        <button
          className="mt-6 flex h-9 w-full cursor-pointer items-center justify-center rounded-md bg-indigo-600 text-[13px] font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('login.submitting') : t('login.submit')}
        </button>

        <div className="my-7 flex items-center gap-3 text-[10px] uppercase text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">
          {t('login.or')}
        </div>
        <button
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 text-[13px] font-medium text-slate-800 transition hover:bg-slate-50"
          type="button"
        >
          <CircleX size={15} /> {t('login.google')}
        </button>
        <button
          className="mx-auto mt-7 block cursor-pointer text-xs text-slate-500 underline underline-offset-2 hover:text-indigo-600"
          type="button"
        >
          {t('login.forgot')}
        </button>
      </form>
    </main>
  )
}
