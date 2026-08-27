import { localizeMessage, resolveLocale } from './localize-message';

describe('backend language contract', () => {
  it('resolves Chinese and English Accept-Language values', () => {
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en-US');
    expect(resolveLocale('zh-CN,zh;q=0.9')).toBe('zh-CN');
    expect(resolveLocale()).toBe('zh-CN');
  });

  it('keeps English messages and translates known Chinese messages', () => {
    expect(localizeMessage('Knowledge base not found', 'en-US')).toBe(
      'Knowledge base not found',
    );
    expect(localizeMessage('Knowledge base not found', 'zh-CN')).toBe(
      '知识库不存在',
    );
    expect(localizeMessage('email must be an email', 'zh-CN')).toBe(
      '参数 email 格式不正确',
    );
    expect(
      localizeMessage('Knowledge base is not ready for chat', 'zh-CN'),
    ).toContain('还没有可检索的已发布文档');
    expect(
      localizeMessage(
        'No matching published knowledge base content was found',
        'zh-CN',
      ),
    ).toContain('没有找到与这个问题相关的资料');
  });
});
