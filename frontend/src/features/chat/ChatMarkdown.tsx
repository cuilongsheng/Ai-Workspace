import { Check, Copy, ImageOff } from 'lucide-react'
import {
  Children,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

type CodeElementProps = {
  children?: ReactNode
  className?: string
}

function textFromChildren(children: ReactNode) {
  return Children.toArray(children).join('').replace(/\n$/, '')
}

function MarkdownCodeBlock({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const codeElement = Children.toArray(children)[0]
  const codeProps = isValidElement<CodeElementProps>(codeElement)
    ? codeElement.props
    : undefined
  const language =
    /(?:^|\s)language-([\w-]+)/.exec(codeProps?.className ?? '')?.[1] ??
    t('chat.plainText')
  const code = textFromChildren(codeProps?.children)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="chat-code-block">
      <div className="chat-code-toolbar">
        <span>{language}</span>
        <button
          aria-label={copied ? t('chat.codeCopied') : t('chat.copyCode')}
          className="chat-code-copy"
          type="button"
          onClick={() => void copyCode()}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? t('chat.copied') : t('chat.copy')}</span>
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  )
}

function isSafeImageSource(src: string) {
  return /^(?:https?:)?\/\//i.test(src) || /^\/(?!\/)/.test(src)
}

function MarkdownImage({ alt, src, title, ...props }: ComponentProps<'img'>) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)

  if (!src || !isSafeImageSource(src) || failed) {
    return (
      <span className="chat-image-unavailable" role="img" aria-label={alt}>
        <ImageOff aria-hidden="true" />
        <span>{alt || t('chat.imageUnavailable')}</span>
      </span>
    )
  }

  return (
    <span className="chat-image-frame">
      <a
        aria-label={t('chat.openImage', {
          name: alt || t('chat.image'),
        })}
        href={src}
        rel="noopener noreferrer"
        target="_blank"
      >
        <img
          {...props}
          alt={alt ?? ''}
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={src}
          title={title}
          onError={() => setFailed(true)}
        />
      </a>
      {title ? <small>{title}</small> : null}
    </span>
  )
}

const markdownComponents: Components = {
  a({ node, href, ...props }) {
    void node
    const external = /^(?:https?:)?\/\//i.test(href ?? '')
    return (
      <a
        {...props}
        href={href}
        rel={external ? 'noopener noreferrer' : undefined}
        target={external ? '_blank' : undefined}
      />
    )
  },
  img({ node, ...props }) {
    void node
    return <MarkdownImage {...props} />
  },
  pre({ node, children }) {
    void node
    return <MarkdownCodeBlock>{children}</MarkdownCodeBlock>
  },
  table({ node, ...props }) {
    void node
    return (
      <div className="chat-table-scroll" tabIndex={0}>
        <table {...props} />
      </div>
    )
  },
}

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={markdownComponents}
      rehypePlugins={[
        [rehypeHighlight, { detect: false, ignoreMissing: true }],
        rehypeKatex,
      ]}
      remarkPlugins={[remarkGfm, remarkMath]}
      skipHtml
    >
      {content}
    </ReactMarkdown>
  )
}
