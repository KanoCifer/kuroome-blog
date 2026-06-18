// Article composables — chat, summary, markdown image, SSE stream.
// Note: ArticleContext is defined in both useArticleChat and useArticleSummary;
// consumers should import it from the file they need. We re-export only the
// non-conflicting symbols here to avoid TS2308 ambiguity.
export {
  useArticleChat,
  type ChatMessage,
} from './useArticleChat'
export { useArticleSummary, MODEL_OPTIONS } from './useArticleSummary'
export { useMarkdownImage } from './useMarkdownImage'
export { consumeSseStream, parseSseChunk } from './useSseStream'
