import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const supportedLanguages = ['zh-CN', 'en-US'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

const savedLanguage = localStorage.getItem('ai-workspace-language')
const browserLanguage = navigator.languages?.[0] ?? navigator.language
const initialLanguage: SupportedLanguage = (
  savedLanguage ?? browserLanguage
).startsWith('en')
  ? 'en-US'
  : 'zh-CN'

const zh = {
  appName: 'AI Workspace',
  language: { zh: '中文', en: 'EN', switch: '切换语言' },
  restoring: '正在恢复会话…',
  navigation: {
    workspace: '工作台',
    tenants: '租户配置',
    departments: '部门配置',
    members: '人员管理',
    prompts: '快捷问题',
    knowledge: '知识库',
    chat: 'AI 对话',
  },
  roles: {
    platform: '平台管理员',
    organization: '企业管理员',
    department: '部门管理员',
    member: '普通成员',
  },
  actions: {
    logout: '退出登录',
    retry: '重试',
    backHome: '返回工作台',
    back: '返回',
    save: '保存',
    saving: '保存中…',
    close: '关闭',
    accountMenu: '打开账户菜单',
  },
  login: {
    title: '登录 AI Workspace',
    subtitle: '企业知识管理与 RAG 控制台',
    account: '用户名或邮箱',
    password: '密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    submit: '登录',
    submitting: '正在登录…',
    errorTitle: '无法登录',
    error: '请检查用户名、邮箱或密码后重试。',
    accountRequired: '请输入用户名或邮箱',
    passwordMin: '密码至少需要 6 个字符',
    or: '或',
    google: '使用 Google 继续',
    forgot: '忘记密码？',
  },
  starter: {
    title: '快捷问题配置',
    description:
      '为每个知识库分别维护快捷问题，保存后会立即在对应 AI 对话中生效。',
    department: '部门',
    knowledgeBase: '知识库',
    noKnowledgeBases: '当前部门暂无知识库',
    question: '快捷问题 {{index}}',
    add: '添加问题',
    remove: '删除',
    save: '保存快捷问题',
    saved: '快捷问题已保存并立即生效。',
    loadError: '快捷问题加载失败，请稍后重试。',
    saveError: '快捷问题保存失败，请检查权限后重试。',
    required: '至少保留一个非空快捷问题。',
  },
  chat: {
    history: '对话历史',
    new: '新建对话',
    search: '搜索对话记录…',
    greeting: '您好，我是您的企业专属 AI 助手',
    intro: '企业知识库已接入，随时提问，帮您高效搞定工作。',
    starters: '您可以这样问我（由部门管理员配置）',
    noStarters: '当前部门尚未配置快捷问题。',
    source: '数据源',
    selectKnowledge: '选择知识库',
    placeholder: '结合选定知识库文档，向我提问任何问题…（Shift + Enter 换行）',
    generating: '正在生成…',
    citations: '参考来源：',
    sourceDocument: '来源文档',
    loadingQuestions: '正在加载快捷问题…',
    untitled: '未命名对话',
    enterpriseKnowledge: '企业知识库',
    deleteConversation: '删除对话 {{title}}',
    closeError: '关闭',
    analyst: '分析员',
    assistant: 'AI 助手',
    grounded: '基于知识库',
    searchKnowledge: '搜索及筛选知识库…',
    availableKnowledge: '可用知识库',
    ready: '可对话',
    waitingForPublish: '待发布',
    checkingReadiness: '正在检查知识库状态…',
    readinessUnknown: '状态未知',
    readinessUnavailable: '暂时无法检查知识库状态，请稍后重试。',
    notReadyShort: '当前知识库暂无已发布内容',
    notReady:
      '当前知识库还没有可检索的已发布文档，请联系部门管理员完成审核并发布。',
    singleKnowledgeHint: 'V1 每个会话固定使用一个企业知识库',
    markdownHint: '支持输入 Markdown、公式及多文档提及',
    copy: '复制',
    copied: '已复制',
    copyCode: '复制代码',
    codeCopied: '代码已复制',
    copyMessage: '复制问题',
    messageCopied: '问题已复制',
    plainText: '纯文本',
    image: '图片',
    openImage: '打开图片：{{name}}',
    imageUnavailable: '图片无法显示',
    sourcePanelTitle: '引用数据源分析',
    sourcePanelIntro:
      '以下是从关联知识库召回的原始文档片段，AI 助手已对其进行了精确定位和解析：',
    relatedDocument: '关联知识文档',
    relevance: '相关度',
    noQuote: '该引用未包含可展示的原文片段。',
    openSource: '查看完整关联页 ↗',
    helpful: '有帮助',
    notHelpful: '没有帮助',
    feedbackFailed: '反馈保存失败，请稍后重试。',
    retrieval: {
      not_ready: '知识库未就绪',
      no_match: '未找到相关资料',
      retrieval_unavailable: '检索服务异常',
      needs_clarification: '需要补充信息',
      partial: '部分匹配',
      grounded: '基于知识库',
    },
  },
  errors: {
    unexpected: '页面发生意外错误',
    unexpectedDescription: '请刷新页面；如果问题持续存在，请联系管理员。',
    notFound: '找不到此页面',
    noAccess: '账号尚未分配可访问的部门或角色',
    noAccessDescription: '请联系管理员完成部门和角色分配，然后重新登录。',
  },
  api: {
    success: '操作成功',
    error: '请求失败',
  },
  foundation: {
    title: '前端基础已就绪',
    description: '业务页面将在对应 Figma manifest 条目确认后逐项实现。',
    unavailable: '此功能尚未开放',
  },
}

const en: typeof zh = {
  appName: 'AI Workspace',
  language: { zh: '中文', en: 'EN', switch: 'Switch language' },
  restoring: 'Restoring session…',
  navigation: {
    workspace: 'Workspace',
    tenants: 'Tenants',
    departments: 'Departments',
    members: 'Members',
    prompts: 'Prompts',
    knowledge: 'Knowledge',
    chat: 'AI Chat',
  },
  roles: {
    platform: 'Platform Admin',
    organization: 'Enterprise Admin',
    department: 'Department Admin',
    member: 'Member',
  },
  actions: {
    logout: 'Log out',
    retry: 'Retry',
    backHome: 'Back to workspace',
    back: 'Back',
    save: 'Save',
    saving: 'Saving…',
    close: 'Close',
    accountMenu: 'Open account menu',
  },
  login: {
    title: 'Sign in to AI Workspace',
    subtitle: 'Enterprise Knowledge Management & RAG console',
    account: 'Username or email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign In',
    submitting: 'Signing in…',
    errorTitle: 'Unable to sign in',
    error: 'Check your username, email, or password and try again.',
    accountRequired: 'Enter your username or email',
    passwordMin: 'Password must be at least 6 characters',
    or: 'Or',
    google: 'Continue with Google',
    forgot: 'Forgot your password?',
  },
  starter: {
    title: 'Starter Question Settings',
    description:
      'Maintain starter questions for each knowledge base. Changes appear immediately in the related AI chat.',
    department: 'Department',
    knowledgeBase: 'Knowledge base',
    noKnowledgeBases: 'No knowledge bases in this department',
    question: 'Starter question {{index}}',
    add: 'Add question',
    remove: 'Remove',
    save: 'Save starter questions',
    saved: 'Starter questions saved and available immediately.',
    loadError: 'Unable to load starter questions. Try again later.',
    saveError:
      'Unable to save starter questions. Check your permission and retry.',
    required: 'Keep at least one non-empty starter question.',
  },
  chat: {
    history: 'Conversations',
    new: '+ New',
    search: 'Search conversations…',
    greeting: 'Hello, I am your dedicated enterprise AI assistant',
    intro:
      'Your enterprise knowledge base is connected. Ask anytime and get work done efficiently.',
    starters: 'Try asking (configured by your department admin)',
    noStarters: 'No starter questions are configured for this department.',
    source: 'Source',
    selectKnowledge: 'Select a knowledge base',
    placeholder:
      'Ask a question grounded in the selected knowledge base… (Shift + Enter for a new line)',
    generating: 'Generating…',
    citations: 'Sources:',
    sourceDocument: 'Source document',
    loadingQuestions: 'Loading starter questions…',
    untitled: 'Untitled conversation',
    enterpriseKnowledge: 'Enterprise knowledge base',
    deleteConversation: 'Delete conversation {{title}}',
    closeError: 'Close',
    analyst: 'Analyst',
    assistant: 'AI Assistant',
    grounded: 'Knowledge grounded',
    searchKnowledge: 'Search knowledge bases…',
    availableKnowledge: 'Available',
    ready: 'Ready',
    waitingForPublish: 'Awaiting publication',
    checkingReadiness: 'Checking knowledge base status…',
    readinessUnknown: 'Status unavailable',
    readinessUnavailable:
      'The knowledge base status could not be checked. Please try again.',
    notReadyShort: 'No published content is available',
    notReady:
      'This knowledge base has no searchable published documents. Ask a department administrator to review and publish its content.',
    singleKnowledgeHint:
      'Each V1 conversation uses one enterprise knowledge base',
    markdownHint: 'Supports Markdown, formulas, and document references',
    copy: 'Copy',
    copied: 'Copied',
    copyCode: 'Copy code',
    codeCopied: 'Code copied',
    copyMessage: 'Copy question',
    messageCopied: 'Question copied',
    plainText: 'Plain text',
    image: 'Image',
    openImage: 'Open image: {{name}}',
    imageUnavailable: 'Image unavailable',
    sourcePanelTitle: 'Citation Sources',
    sourcePanelIntro:
      'These source passages were retrieved and precisely located from the related knowledge base:',
    relatedDocument: 'Related document',
    relevance: 'Relevance',
    noQuote: 'This citation does not include a displayable source passage.',
    openSource: 'Open related source ↗',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    feedbackFailed: 'Feedback could not be saved. Please try again.',
    retrieval: {
      not_ready: 'Knowledge base not ready',
      no_match: 'No matching content',
      retrieval_unavailable: 'Retrieval unavailable',
      needs_clarification: 'Clarification needed',
      partial: 'Partially grounded',
      grounded: 'Knowledge grounded',
    },
  },
  errors: {
    unexpected: 'An unexpected error occurred',
    unexpectedDescription:
      'Refresh the page. Contact your administrator if the problem continues.',
    notFound: 'Page not found',
    noAccess: 'No department or role has been assigned to this account',
    noAccessDescription:
      'Ask an administrator to assign access, then sign in again.',
  },
  api: {
    success: 'Action completed',
    error: 'Request failed',
  },
  foundation: {
    title: 'Frontend foundation is ready',
    description:
      'Business pages will be implemented after their Figma manifest entries are confirmed.',
    unavailable: 'This feature is not available yet',
  },
}

void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: 'zh-CN',
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
  resources: { 'zh-CN': { translation: zh }, 'en-US': { translation: en } },
})

i18n.on('languageChanged', (language) => {
  const normalized = language.startsWith('en') ? 'en-US' : 'zh-CN'
  localStorage.setItem('ai-workspace-language', normalized)
  document.documentElement.lang = normalized === 'en-US' ? 'en' : 'zh-CN'
})

export default i18n
