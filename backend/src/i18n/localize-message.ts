export type ApiLocale = 'zh-CN' | 'en-US';

export function resolveLocale(value?: string): ApiLocale {
  return value?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}

const zhMessages: Record<string, string> = {
  'Authenticated user is missing': '缺少已认证用户信息',
  'Account is not available': '账号当前不可用',
  'Administrator permission is required': '需要管理员权限',
  'All chunks must contain indexed content': '所有文档分段都必须包含可索引内容',
  'Department access is required': '需要当前部门的访问权限',
  'Department context is missing': '缺少部门上下文',
  'Department not found': '部门不存在',
  'Department administrator is required': '需要部门管理员权限',
  'Department member role is required': '需要当前部门的普通成员角色',
  'Department role not found': '部门角色不存在',
  'Department or role not found in organization':
    '当前组织中不存在该部门或角色',
  'Document chunk not found': '文档分段不存在',
  'Document is already being processed': '文档正在处理中',
  'Document must be in REVIEWING status': '文档必须处于审核中状态',
  'Document not found': '文档不存在',
  'Document parsing produced no usable content': '文档解析后没有可用内容',
  'Document with this name already exists': '已存在同名文档',
  'Embedding provider rate limit exceeded': '向量服务请求频率已超限',
  'Failed to generate assistant response.': '生成 AI 回答失败。',
  'File is required': '请选择文件',
  'Invalid access token': '访问令牌无效',
  'Invalid account or password': '账号或密码错误',
  'Invalid Ollama embedding response': 'Ollama 向量响应无效',
  'Invalid refresh token': '刷新令牌无效',
  'Invalid reranker response': '重排服务响应无效',
  'Invalid or expired refresh token': '刷新令牌无效或已过期',
  'Knowledge base already exists': '已存在同名知识库',
  'Knowledge base name already exists': '已存在同名知识库',
  'KnowledgeBase name already exists': '已存在同名知识库',
  'Knowledge base is no longer accessible': '该知识库已无法访问',
  'Knowledge base not found': '知识库不存在',
  'Knowledge base is not ready for chat':
    '当前知识库还没有可检索的已发布文档，请联系部门管理员完成审核并发布。',
  'No matching published knowledge base content was found':
    '当前知识库有已发布内容，但没有找到与这个问题相关的资料。请尝试换一种问法或切换知识库。',
  'Knowledge retrieval service is unavailable':
    '知识检索服务暂时不可用，这不是知识库没有答案。请稍后重试或联系管理员。',
  'The question needs clarification':
    '当前问题存在多个可能的匹配范围，请补充完整名称、时间范围或具体主题。',
  'Only part of the question is supported by the knowledge base':
    '当前知识库只能支持问题的一部分，回答会明确区分已确认与未确认内容。',
  'Ask a department administrator to publish documents':
    '联系部门管理员审核并发布文档',
  'Choose another knowledge base': '切换到其他知识库',
  'Check whether names contain typos': '检查名称是否有错别字',
  'Ask with a complete entity name': '使用完整名称重新提问',
  'Try again later': '稍后重试',
  'Contact an administrator': '联系管理员检查检索服务',
  'Add a complete name or time range': '补充完整名称或时间范围',
  'Ask a follow-up question about the unsupported part':
    '针对未确认部分补充信息后继续提问',
  'Message not found': '消息不存在',
  'Only failed documents can be reprocessed': '只有处理失败的文档可以重新解析',
  'Only parsed documents can enter review': '只有解析完成的文档可以进入审核',
  'Only reviewing documents can be published': '只有审核中的文档可以发布',
  'Only tenant administrators can configure departments':
    '只有租户管理员可以配置部门',
  'Organization context is required': '需要组织上下文',
  'Organization administrator is required': '需要租户管理员权限',
  'Organization is not available': '当前组织不可用',
  'Organization not found': '组织不存在',
  'Refresh token is missing': '缺少刷新令牌',
  'Refresh token reuse detected': '检测到刷新令牌重复使用',
  'Reranker request timed out': '重排服务请求超时',
  'Session is not available': '登录会话当前不可用',
  'User already exists; assign a role instead': '用户已存在，请直接分配角色',
  'User already exists': '用户已存在',
  'Employee not found': '租户员工不存在',
  'Membership not found': '部门成员关系不存在',
  'You cannot disable your own account': '不能禁用自己的当前账号',
  'You cannot remove your own account': '不能将自己的当前账号移出租户',
  'You cannot remove your own membership': '不能移除自己的当前部门关系',
  'You cannot remove your own organization administrator role':
    '不能移除自己的租户管理员角色',
  'You cannot remove your own department administrator role':
    '不能移除自己的部门管理员角色',
  'Organization administrators may only assign the initial department administrator':
    '租户管理员只能设置初始部门管理员',
  'User is not available': '用户当前不可用',
  'User not found': '用户不存在',
  'User, department, or role not found in organization':
    '当前组织中不存在该用户、部门或角色',
  'Conversation not found': '对话不存在',
  'You no longer have access to this department': '您已无权访问该部门',
  'Ollama embedding request timed out': 'Ollama 向量请求超时',
};

export function localizeMessage(message: string, locale: ApiLocale): string {
  if (locale === 'en-US' || !message) return message;
  if (zhMessages[message]) return zhMessages[message];
  if (/^Missing permission: /.test(message)) return '缺少所需权限';
  if (/^Missing platform permission: /.test(message)) return '缺少平台权限';
  if (/^property .+ should not exist$/.test(message)) {
    const field = message.split(' ')[1];
    return `不允许提交字段 ${field}`;
  }
  const validationField = message.match(/^([^ ]+) must /)?.[1];
  if (validationField) return `参数 ${validationField} 格式不正确`;
  return message;
}
