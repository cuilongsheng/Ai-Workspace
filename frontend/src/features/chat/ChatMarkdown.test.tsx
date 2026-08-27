import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatMarkdown } from './ChatMarkdown'

describe('ChatMarkdown', () => {
  it('renders GFM, highlighted code, responsive tables, images, and math', () => {
    render(
      <ChatMarkdown
        content={`## 输出格式

- [x] Markdown
- [ ] 图片

| 类型 | 状态 |
| --- | --- |
| 代码 | 支持 |

\`\`\`ts
const answer = 42
\`\`\`

![示例图片](https://example.com/example.png "示例标题")

公式：$E = mc^2$`}
      />,
    )

    expect(screen.getByText('输出格式')).toHaveProperty('tagName', 'H2')
    expect(document.querySelector('.chat-table-scroll')).toBeInTheDocument()
    expect(document.querySelector('.chat-code-copy')).toBeInTheDocument()
    expect(document.querySelector('.hljs-keyword')).toHaveTextContent('const')
    expect(screen.getByAltText('示例图片')).toHaveAttribute('loading', 'lazy')
    expect(document.querySelector('.chat-image-frame')).toBeInTheDocument()
    expect(document.querySelector('.katex')).toBeInTheDocument()
  })

  it('does not render raw HTML from an AI response', () => {
    const { container } = render(
      <ChatMarkdown content={'<script>alert("unsafe")</script>\n\n安全内容'} />,
    )

    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(container).toHaveTextContent('安全内容')
  })
})
