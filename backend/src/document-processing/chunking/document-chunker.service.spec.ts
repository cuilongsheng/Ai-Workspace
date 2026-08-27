import { DocumentChunkerService } from './document-chunker.service';

describe('DocumentChunkerService hierarchical sections', () => {
  const service = new DocumentChunkerService();

  it('keeps an institution and all of its majors in one parent section', () => {
    const text = `志\n愿\n46\n垫 郑州升达经贸管理学院\n河南郑州 / 民办 / 财经类 院校代码: 6195\n${'招生数据\n'.repeat(250)}低风险\n1\n审计学(注册会计师)\n专业代码：34\n低风险\n2\n财务管理(智能财务)\n-- 16 of 22 --\n低风险\n3\n会计学\n低风险\n4\n税收学(税务师)\n志\n愿\n47\n垫 皖江工学院\n安徽马鞍山 / 民办 / 综合类\n1\n财务管理`;

    const chunks = service.chunk(text);
    const target = chunks.filter(
      (chunk) => chunk.sectionTitle === '郑州升达经贸管理学院',
    );

    expect(target.length).toBeGreaterThan(1);
    expect(new Set(target.map((chunk) => chunk.sectionIndex)).size).toBe(1);
    expect(target.map((chunk) => chunk.content).join('\n')).toContain(
      '税收学(税务师)',
    );
    expect(target.map((chunk) => chunk.content).join('\n')).not.toContain(
      '皖江工学院',
    );
    expect(chunks.some((chunk) => chunk.sectionTitle === '皖江工学院')).toBe(
      true,
    );
  });

  it('uses markdown headings as parent boundaries', () => {
    const chunks = service.chunk(
      '# Policy A\nFirst policy content.\n\n## Policy B\nSecond policy content.',
    );
    expect(chunks.map((chunk) => chunk.sectionTitle)).toEqual([
      'Policy A',
      'Policy B',
    ]);
  });
});
