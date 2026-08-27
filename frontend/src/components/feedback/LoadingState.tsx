interface LoadingStateProps {
  label: string
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <main className="centered-state" aria-live="polite" aria-busy="true">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </main>
  )
}
