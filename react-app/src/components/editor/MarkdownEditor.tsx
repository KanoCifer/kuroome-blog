import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import { marked } from 'marked';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadService } from '@/service/uploadService';

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  storageKey?: string;
}

interface Draft {
  key: string;
  title: string;
  content: string;
  hasContent: boolean;
}

const DRAFT_PREFIX = 'tiptap-draft-';

type Mode = 'edit' | 'preview';

export default function MarkdownEditor({
  value,
  onChange,
  storageKey = 'default',
}: MarkdownEditorProps) {
  const [content, setContent] = useState(value);
  const [mode, setMode] = useState<Mode>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value !== content) {
      setContent(value);
    }
  }, [value]);

  // Auto-save draft
  useEffect(() => {
    if (!storageKey || storageKey === 'default') return;

    const safeKey = storageKey.trim().replace(/[^\w\u4e00-\u9fa5-]/g, '_');
    const draftKey = `${DRAFT_PREFIX}${safeKey}`;

    const timer = setTimeout(() => {
      if (content.trim()) {
        const draft: Draft = {
          key: draftKey,
          title: storageKey,
          content,
          hasContent: content.trim().length > 0,
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, storageKey]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setContent(newValue);
      onChange(newValue);
    },
    [onChange],
  );

  // Handle tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;

        const newValue =
          content.substring(0, start) + '  ' + content.substring(end);
        setContent(newValue);
        onChange(newValue);

        // Restore cursor position
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        }, 0);
      }
    },
    [content, onChange],
  );

  // Render markdown to HTML
  const renderedHtml = (() => {
    if (!content) return '';
    try {
      const rawHtml = marked.parse(content, { async: false }) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['data-md-id', 'data-align'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|blob):|[^a-z]*|[a-z0-9.+-]*$)/i,
      });
    } catch {
      return '';
    }
  })();

  // Highlight code blocks after render
  useEffect(() => {
    if (mode === 'preview' && previewRef.current) {
      previewRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [renderedHtml, mode]);

  // Handle image upload
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await uploadService.uploadEditorImage(formData);
        const imageUrl = response.data.data.url;
        const imageMd = `![image](${imageUrl})`;

        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newValue =
            content.substring(0, start) +
            imageMd +
            '\n\n' +
            content.substring(end);
          setContent(newValue);
          onChange(newValue);
        } else {
          setContent((prev) => prev + imageMd + '\n\n');
          onChange(content + imageMd + '\n\n');
        }
      } catch (err) {
        console.error('图片上传失败:', err);
      }

      // Reset input
      e.target.value = '';
    },
    [content, onChange],
  );

  const insertImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Mode Toggle */}
      <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setMode('edit')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mode === 'edit'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          编辑
        </button>
        <button
          type="button"
          onClick={() => setMode('preview')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mode === 'preview'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          预览
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'edit' ? (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-end gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={insertImage}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                插入图片
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-slate-300 focus:ring-0 dark:placeholder:text-slate-700 md:p-6"
              placeholder="# 在此编写 Markdown 内容

- 支持列表
- **粗体**
- *斜体*

```js
console.log('Hello!');
```"
            />
          </div>
        ) : (
          <div
            ref={previewRef}
            className="prose prose-slate dark:prose-invert max-w-none h-full overflow-y-auto p-4 md:p-6"
          >
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : (
              <p className="text-slate-400">暂无内容</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Draft management utilities
export function getAllDrafts(): Draft[] {
  const drafts: Draft[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_PREFIX)) {
      try {
        const draft = JSON.parse(localStorage.getItem(key) || '');
        drafts.push(draft);
      } catch {
        // Skip invalid drafts
      }
    }
  }
  return drafts.sort(
    (a, b) =>
      new Date(b.title).getTime() - new Date(a.title).getTime(),
  );
}

export function deleteDraft(key: string): void {
  localStorage.removeItem(key);
}

export function switchDraft(key: string): Draft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(key) || '');
    return draft;
  } catch {
    return null;
  }
}
