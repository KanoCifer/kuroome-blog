import MarkdownEditor, {
  deleteDraft,
  getAllDrafts,
  switchDraft,
} from '@/components/editor/MarkdownEditor';
import type { CategoryItem } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import { useNotificationStore } from '@/stores/notificationState';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Icons
function IconDel() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

export default function BlogEditView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notification = useNotificationStore();

  const isEdit = id !== undefined && id !== 'new';
  const postId = isEdit ? id : null;

  const [title, setTitle] = useState('');
  const [debouncedTitle, setDebouncedTitle] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [pin, setPin] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [draftMenuOpen, setDraftMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const titleDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce title
  useEffect(() => {
    if (titleDebounceTimer.current) {
      clearTimeout(titleDebounceTimer.current);
    }
    titleDebounceTimer.current = setTimeout(() => {
      setDebouncedTitle(title);
    }, 5000);

    return () => {
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }
    };
  }, [title]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const service = blogService();
      const legacyCategories = await service.getLegacyCategories();
      setCategories(legacyCategories);
    } catch (err) {
      console.error(err);
      notification.error('加载分类失败');
    }
  }, [notification]);

  // Fetch post if editing
  const fetchPost = useCallback(
    async (pid: string) => {
      setLoading(true);
      try {
        const service = blogService();
        const post = await service.getLegacyPost(pid);
        setTitle(post.title || '');
        setDebouncedTitle(post.title || '');
        setCategory(post.category_id ? String(post.category_id) : '');
        setBody(post.body || '');
        setPin(Boolean(post.is_pinned));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '加载文章失败');
        notification.error(error);
      } finally {
        setLoading(false);
      }
    },
    [notification, error],
  );

  useEffect(() => {
    fetchCategories();
    if (isEdit && postId) {
      fetchPost(postId);
    }
  }, [fetchCategories, isEdit, postId, fetchPost]);

  // Get current category name
  const currentCategory = categories.find(
    (cat) => String(cat.id) === category,
  )?.name;

  // Draft management
  const draftList = getAllDrafts();

  const handleSwitchDraft = useCallback(
    (draftKey: string, draftTitle: string) => {
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
        titleDebounceTimer.current = null;
      }
      const actualTitle = draftTitle === '未命名草稿' ? '' : draftTitle;
      setTitle(actualTitle);
      setDebouncedTitle(actualTitle);

      const draft = switchDraft(draftKey);
      if (draft) {
        setBody(draft.content);
      }
      setDraftMenuOpen(false);
      notification.success(`已切换到草稿：${draftTitle}`);
    },
    [notification],
  );

  const handleDeleteDraft = useCallback(
    (draftKey: string, draftTitle: string) => {
      deleteDraft(draftKey);
      notification.success(`已删除草稿：${draftTitle}`);
    },
    [notification],
  );

  const handleSaveDraft = useCallback(() => {
    // Trigger save by updating localStorage
    if (debouncedTitle && body) {
      const safeKey = debouncedTitle
        .trim()
        .replace(/[^\w\u4e00-\u9fa5-]/g, '_');
      const draftKey = `tiptap-draft-${safeKey}`;
      const draft = {
        key: draftKey,
        title: debouncedTitle,
        content: body,
        hasContent: body.trim().length > 0,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      notification.success('草稿已保存');
    } else {
      notification.info('请先输入标题和内容');
    }
  }, [debouncedTitle, body, notification]);

  const handleSubmit = async () => {
    // Check if form is still connected to DOM
    if (!formRef.current || !document.body.contains(formRef.current)) {
      console.warn(
        'Form submission canceled because the form is not connected',
      );
      return;
    }

    if (!title.trim()) {
      setError('标题不能为空');
      notification.error(error);
      return;
    }

    if (!category) {
      setError('请选择分类');
      notification.error(error);
      return;
    }

    if (!body.trim()) {
      setError('内容不能为空');
      notification.error(error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const service = blogService();
      const payload = {
        title: title,
        category_id: Number(category),
        body: body,
        is_pinned: pin ? 1 : 0,
      };

      if (isEdit && postId) {
        const updatePayload = { ...payload, _id: postId };
        await service.updateLegacyPost(updatePayload);
        notification.success('文章更新成功');
      } else {
        await service.createLegacyPost(payload);
        notification.success('文章创建成功');
      }

      // Navigate back
      navigate(-1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存文章失败');
      notification.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card flex h-full flex-col"
    >
      {/* Header */}
      <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <button onClick={handleCancel} className="text-foreground -ml-2 p-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h1 className="text-foreground text-base font-semibold">
          {isEdit ? '编辑文章' : '发布文章'}
        </h1>
        <div className="w-9" />
      </div>

      <div className="flex flex-1 flex-col">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 text-destructive mx-4 mb-4 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && isEdit && (
          <div className="flex h-64 items-center justify-center">
            <div className="border-border border-t-primary h-8 w-8 animate-spin rounded-full border-2"></div>
          </div>
        )}

        {/* Form */}
        {!loading || !isEdit ? (
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-1 flex-col"
          >
            {/* Title Input */}
            <div className="mx-4 mb-3">
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                type="text"
                required
                placeholder="文章标题..."
                className="text-foreground placeholder:text-muted-foreground block w-full border-0 bg-transparent px-2 py-3 text-xl font-bold outline-0 focus:ring-0 md:text-2xl"
              />
              <div className="bg-border h-px" />
            </div>

            {/* Controls Bar */}
            <div className="relative z-10 flex items-center gap-2 px-4 pb-3">
              {/* Pin Button */}
              <button
                type="button"
                onClick={() => setPin(!pin)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  pin
                    ? 'border-warning bg-warning/15 text-warning'
                    : 'border-border text-foreground'
                }`}
              >
                {pin ? '已置顶' : '置顶'}
              </button>

              {/* Category Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
                  className="border-border text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                >
                  <span>{currentCategory || '分类'}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3 w-3 transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {categoryMenuOpen && (
                  <div className="border-border bg-card absolute top-full left-0 z-50 mt-1 w-36 rounded-lg border py-1 shadow-lg">
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setCategory(String(cat.id));
                          setCategoryMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                          category === String(cat.id)
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Draft Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setDraftMenuOpen(!draftMenuOpen)}
                  className="border-border text-foreground flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium"
                >
                  草稿
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3 w-3 transition-transform ${draftMenuOpen ? 'rotate-180' : ''}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {draftMenuOpen && (
                  <div className="border-border bg-card absolute top-full right-0 z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-lg border py-1 shadow-lg">
                    {draftList.length === 0 ? (
                      <div className="text-muted-foreground px-3 py-2 text-xs">
                        暂无草稿
                      </div>
                    ) : (
                      draftList.map((draft) => (
                        <div
                          key={draft.key}
                          className="flex items-center justify-between px-3 py-2"
                        >
                          <span
                            className="text-foreground flex-1 cursor-pointer truncate text-xs"
                            onClick={() =>
                              handleSwitchDraft(draft.key, draft.title)
                            }
                          >
                            {draft.title || '未命名'}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive ml-2 p-1"
                            onClick={() =>
                              handleDeleteDraft(draft.key, draft.title)
                            }
                          >
                            <IconDel />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Save Draft */}
              <button
                type="button"
                onClick={handleSaveDraft}
                className="border-border text-foreground shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
              >
                保存
              </button>
            </div>

            {/* Markdown Editor */}
            <div className="border-border mx-4 mb-4 flex-1 overflow-hidden rounded-lg border">
              <MarkdownEditor
                value={body}
                onChange={setBody}
                storageKey={debouncedTitle}
              />
            </div>

            {/* Bottom Action Bar - Fixed on mobile */}
            <div className="border-border bg-card mb-20 shrink-0 border-t px-4 py-3">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="border-border text-foreground rounded-full border px-4 py-2 text-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center justify-center rounded-full px-6 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : isEdit ? (
                    '保存'
                  ) : (
                    '发布'
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </motion.div>
  );
}
