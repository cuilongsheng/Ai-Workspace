import type { ReactNode } from 'react'

interface FeedbackStateProps {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function FeedbackState({
  eyebrow,
  title,
  description,
  action,
}: FeedbackStateProps) {
  return (
    <section className="feedback-card">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </section>
  )
}
