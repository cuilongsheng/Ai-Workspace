import { AlertTriangle, X } from 'lucide-react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose()
      }}
    >
      <section
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="alertdialog"
      >
        <header className="flex items-start gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${destructive ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}
          >
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
          <button
            aria-label={cancelLabel}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </header>
        <footer className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${destructive ? 'bg-rose-600' : 'bg-indigo-600'}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}
