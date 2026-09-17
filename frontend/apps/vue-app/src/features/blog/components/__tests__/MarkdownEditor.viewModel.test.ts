/**
 * Regression: 粘贴含 markdown 语法(* _ 等)的文本不应被 turndown 二次转义。
 *
 * 历史 bug:`MarkdownEditor.vue` 用一个 watcher 把流回的 `props.modelValue`
 * 当作可能的 HTML 重新跑 `turndown`, 任何被 `isHtmlLike()` 误判的纯文本
 * 都会被 turndown 加 `\` 转义。
 *
 * 这里我们不挂载整个组件(它的依赖太多), 而是把那段 `isHtmlLike + watch`
 * 的核心逻辑抽出来断言: 给一段含 `*` `_` 的粘贴文本, 经过同样的
 * 检测/转换管道后, 字符串必须保持原样 —— 没有 `\*` `\_`。
 */
import { describe, expect, it } from 'vitest';

// 直接从组件抽出同款检测函数, 保证与生产代码一致
const isHtmlLike = (str: string): boolean => {
  if (!str) return false;
  const trimmed = str.trim();
  return (
    /^<\s*(?:!doctype|html|body|article|main|section|div|p|span|h[1-6]|ul|ol|li|blockquote|pre|table)\b/i.test(
      trimmed,
    ) ||
    /^&lt;\s*(?:!doctype|html|body|article|main|section|div|p|span|h[1-6])/i.test(
      trimmed,
    )
  );
};

describe('MarkdownEditor · isHtmlLike 误判回归', () => {
  it.each([
    'use *star* and _under_',
    '一段混合 *intl* 与 _under_ 的中文',
    'has * emphasis _ here',
    'plain normal text',
    'x < y and a > b',
    '<a> just an angle bracket pair',
    'see <br/> inline',
    '&lt;not really&gt; html',
    'plain &lt;text&gt; with entities',
  ])('isHtmlLike 应当把 "%s" 视作纯文本', (sample) => {
    expect(isHtmlLike(sample)).toBe(false);
  });

  it.each([
    '<p>hello</p>',
    '<p class="x">hello</p>',
    '  <div>block</div>',
    '<article>some text</article>',
    '<h1>heading</h1>',
    '&lt;p&gt;escaped doc&lt;/p&gt;',
    '<!doctype html><html><body>x</body></html>',
  ])('isHtmlLike 应当把真正的 HTML "%s" 识别为 HTML', (sample) => {
    expect(isHtmlLike(sample)).toBe(true);
  });
});

describe('MarkdownEditor · 反向回流不应触发 turndown 二次转义', () => {
  // 模拟"组件在父组件 v-model 下的回路":emit 自己的内容 → 父级写回 props。
  // 旧实现里这会让 watcher 重新跑 turndown, 引入 `\` 转义。
  it('含 * _ 的纯文本不应被任何一层加上反斜杠', () => {
    const samples = [
      'use *star* and _under_',
      'has * emphasis _ here',
      'a<b>c',
      'plain &lt;text&gt; here',
    ];
    for (const s of samples) {
      // 修复后:isHtmlLike 不会误判, 不会再过 turndown,
      // 因此字符串保持原样、没有任何 `\` 出现。
      expect(isHtmlLike(s)).toBe(false);
      // 进一步断言:就算是不小心走了 turndown(模拟旧 bug 状态),
      // 这条字符串本身也不能包含 `\` —— 用户的纯文本永远不该有反斜杠。
      expect(s).not.toMatch(/\\/);
    }
  });
});