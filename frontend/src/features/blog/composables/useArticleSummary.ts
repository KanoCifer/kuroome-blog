import { computed, ref } from 'vue';
import { llmGateway } from '@/features/blog/api';
import { useTypewriter } from '@/shared/composables/useTypewriter';
import { stripHtml } from '@/utils/text';

export interface ArticleContext {
  title?: string;
  content: string;
}

/** 可选模型列表 */
export const MODEL_OPTIONS = [
  { label: 'Ring 2.6', value: 'Ring 2.6' },
  { label: 'Ling 2.6', value: 'Ling 2.6' },
] as const;

/**
 * 封装"AI 文章总结"的状态：缓存检查、生成、流式拼接、错误提示。
 * 组件只需绑定 loading/summary/hasGenerated/errorMessage，配合 canSummarize 控制按钮。
 */
export function useArticleSummary(ctx: ArticleContext) {
  const loading = ref(false);
  const tw = useTypewriter();
  const summary = tw.text;
  const hasGenerated = ref(false);
  const errorMessage = ref('');
  const selectedModel = ref<string>(MODEL_OPTIONS[0].value);

  const pureContent = computed(() => stripHtml(ctx.content));

  const canSummarize = computed(
    () => pureContent.value.length > 0 && !loading.value,
  );

  /** 静默查询后端缓存的总结，命中则直接展示。未登录也会发起，命中即显示。 */
  async function checkCachedSummary() {
    if (!pureContent.value) return;
    try {
      const data = await llmGateway.getCachedSummary({
        article_content: pureContent.value,
        ...(ctx.title ? { article_title: ctx.title } : {}),
      });
      if (data.cached && data.summary) {
        summary.value = data.summary;
        hasGenerated.value = true;
      }
    } catch {
      // 缓存查询失败不影响正常使用
    }
  }

  async function generate(notifyError: (msg: string) => void, model?: string) {
    if (!canSummarize.value) {
      notifyError('文章内容为空，无法总结');
      return;
    }

    loading.value = true;
    errorMessage.value = '';
    tw.reset();

    try {
      await llmGateway.streamSummary(
        {
          title: ctx.title || '',
          content: pureContent.value,
          model: model || selectedModel.value,
        },
        {
          onData: (data) => {
            if (data.content) tw.push(data.content);
          },
          onDone: () => {
            tw.done();
            hasGenerated.value = true;
          },
        },
      );
    } catch (error: unknown) {
      errorMessage.value =
        error instanceof Error ? error.message : 'AI总结失败，请稍后重试';
      notifyError(errorMessage.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    summary,
    hasGenerated,
    errorMessage,
    canSummarize,
    selectedModel,
    modelOptions: MODEL_OPTIONS,
    checkCachedSummary,
    generate,
  };
}