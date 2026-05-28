import { onBeforeUnmount, ref } from 'vue';
import { uploadService } from '@/service/uploadService';

export function useMarkdownImage() {
  const blobFileMap = ref<Map<string, File>>(new Map());
  const fileInputRef = ref<HTMLInputElement | null>(null);

  // Image editor state
  const isImageEditorOpen = ref(false);
  const editingImageUrl = ref('');
  const editingImageAlt = ref('');
  const editingImageTitle = ref('');
  const editingImageWidth = ref('');
  const editingImageHeight = ref('');
  const editingImageAlign = ref<'left' | 'center' | 'right'>('center');
  const editingImageFile = ref<File | null>(null);

  // Create blob URL from file, store in map, return Markdown
  function addImageFile(file: File): string {
    const blobUrl = URL.createObjectURL(file);
    blobFileMap.value.set(blobUrl, file);
    return `![image](${blobUrl})`;
  }

  // Handle toolbar image upload → returns Markdown or null
  function handleImageUpload(event: Event): string | null {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return null;
    const file = target.files[0];
    const md = addImageFile(file);
    target.value = '';
    return md;
  }

  // Handle drag-and-drop → returns Markdown strings
  function handleDrop(event: DragEvent): string[] {
    const results: string[] = [];
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return results;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      results.push(addImageFile(file));
    }
    return results;
  }

  // Handle clipboard paste → returns Markdown strings
  function handlePaste(event: ClipboardEvent): string[] {
    const results: string[] = [];
    const items = event.clipboardData?.items;
    if (!items) return results;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          results.push(addImageFile(file));
        }
      }
    }
    return results;
  }

  function openImageEditor(img: HTMLImageElement) {
    editingImageUrl.value = img.currentSrc || img.src;
    editingImageAlt.value = img.alt || '';
    editingImageTitle.value = img.getAttribute('title') || '';
    editingImageWidth.value = img.getAttribute('width') || '';
    editingImageHeight.value = img.getAttribute('height') || '';
    editingImageAlign.value = 'center';
    editingImageFile.value = null;
    isImageEditorOpen.value = true;
  }

  function closeImageEditor() {
    isImageEditorOpen.value = false;
    editingImageUrl.value = '';
    editingImageAlt.value = '';
    editingImageTitle.value = '';
    editingImageWidth.value = '';
    editingImageHeight.value = '';
    editingImageAlign.value = 'center';
    editingImageFile.value = null;
  }

  function handleReplaceImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const file = target.files[0];
    const newBlobUrl = URL.createObjectURL(file);
    blobFileMap.value.set(newBlobUrl, file);
    editingImageUrl.value = newBlobUrl;
    editingImageFile.value = file;
    if (!editingImageAlt.value) {
      editingImageAlt.value = file.name;
    }
    target.value = '';
  }

  function openImageInNewTab(url: string) {
    window.open(url);
  }

  // Upload all blob images to server and replace URLs in content
  async function getContentForPublish(content: string): Promise<string> {
    const entries = [...blobFileMap.value.entries()];
    const results = await Promise.all(
      entries.map(async ([blobUrl, file]) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await uploadService.uploadEditorImage(formData);
        URL.revokeObjectURL(blobUrl);
        return { blobUrl, serverUrl: response.url };
      }),
    );

    let result = content;
    for (const { blobUrl, serverUrl } of results) {
      result = result.replaceAll(blobUrl, serverUrl);
    }
    blobFileMap.value.clear();
    return result;
  }

  onBeforeUnmount(() => {
    for (const blobUrl of blobFileMap.value.keys()) {
      URL.revokeObjectURL(blobUrl);
    }
    blobFileMap.value.clear();
  });

  return {
    blobFileMap,
    fileInputRef,
    isImageEditorOpen,
    editingImageUrl,
    editingImageAlt,
    editingImageTitle,
    editingImageWidth,
    editingImageHeight,
    editingImageAlign,
    editingImageFile,
    addImageFile,
    handleImageUpload,
    handleDrop,
    handlePaste,
    openImageEditor,
    closeImageEditor,
    handleReplaceImageUpload,
    openImageInNewTab,
    getContentForPublish,
  };
}
