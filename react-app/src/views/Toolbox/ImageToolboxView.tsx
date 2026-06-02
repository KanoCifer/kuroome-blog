import BasicDetail from '@/components/basic/BasicDetail';
import { formatBytes, getFileExtension, processImage } from '@/utils/handlePic';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface OutputTypeOption {
  label: string;
  value: 'image/webp' | 'image/jpeg' | 'image/png';
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const outputTypes: OutputTypeOption[] = [
  { label: 'WebP', value: 'image/webp' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
];

function getOutputExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.img';
  }
}

export default function ImageToolboxView() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState('');
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState('');
  const [originalPreviewZoom, setOriginalPreviewZoom] = useState(1);
  const [processedPreviewZoom, setProcessedPreviewZoom] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [maxWidth, setMaxWidth] = useState(1600);
  const [enableMaxWidth, setEnableMaxWidth] = useState(true);
  const [quality, setQuality] = useState(0.8);
  const [outputType, setOutputType] =
    useState<OutputTypeOption['value']>('image/webp');

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewDialogUrl, setPreviewDialogUrl] = useState('');
  const [previewDialogAlt, setPreviewDialogAlt] = useState('');

  const compressionRatio = useMemo(() => {
    if (!originalFile || !processedBlob) return '-';
    const ratio =
      ((originalFile.size - processedBlob.size) / originalFile.size) * 100;
    return `${ratio.toFixed(1)}%`;
  }, [originalFile, processedBlob]);

  const revokePreviewUrl = useCallback((url: string) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const resetProcessedState = useCallback(() => {
    setProcessedPreviewUrl((prev) => {
      revokePreviewUrl(prev);
      return '';
    });
    setProcessedBlob(null);
    setProcessedPreviewZoom(1);
  }, [revokePreviewUrl]);

  const closePreviewDialog = useCallback(() => {
    setIsPreviewDialogOpen(false);
    setPreviewDialogUrl('');
    setPreviewDialogAlt('');
  }, []);

  const handleSelectedFile = useCallback(
    (selectedFile: File) => {
      setErrorMessage('');

      if (!selectedFile.type.startsWith('image/')) {
        setErrorMessage('请选择有效的图片文件。');
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        setErrorMessage('图片大小不能超过 20MB。');
        return;
      }

      setOriginalFile(selectedFile);
      resetProcessedState();
      setOriginalPreviewZoom(1);

      setOriginalPreviewUrl((prev) => {
        revokePreviewUrl(prev);
        return URL.createObjectURL(selectedFile);
      });
    },
    [resetProcessedState, revokePreviewUrl],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleSelectedFile(selectedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(event.dataTransfer.files);
    const firstImage = files.find((file) => file.type.startsWith('image/'));
    if (firstImage) {
      handleSelectedFile(firstImage);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openPreview = (url: string, alt: string) => {
    if (!url) return;
    setPreviewDialogUrl(url);
    setPreviewDialogAlt(alt);
    setIsPreviewDialogOpen(true);
  };

  const handleProcess = async () => {
    if (!originalFile) {
      setErrorMessage('请先选择图片文件。');
      return;
    }

    setErrorMessage('');
    setProcessing(true);

    try {
      const normalizedQuality = Math.min(Math.max(quality, 0.3), 1);
      const resultBlob = await processImage(originalFile, {
        maxWidth: enableMaxWidth ? maxWidth : undefined,
        quality: normalizedQuality,
        type: outputType,
      });

      resetProcessedState();
      setProcessedBlob(resultBlob);
      setProcessedPreviewUrl(URL.createObjectURL(resultBlob));
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('图片处理失败，请稍后重试。');
      }
    } finally {
      setProcessing(false);
    }
  };

  const downloadProcessedImage = () => {
    if (!processedBlob || !originalFile) return;

    const originalExtension = getFileExtension(originalFile.name);
    const outputExtension = getOutputExtension(outputType);
    const baseName = originalFile.name.replace(originalExtension, '');
    const downloadName = `${baseName}-processed${outputExtension}`;
    const url = URL.createObjectURL(processedBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  };

  const resetAll = () => {
    setErrorMessage('');
    setProcessing(false);

    setOriginalFile(null);
    resetProcessedState();

    setOriginalPreviewUrl((prev) => {
      revokePreviewUrl(prev);
      return '';
    });
    setOriginalPreviewZoom(1);

    setMaxWidth(1600);
    setEnableMaxWidth(true);
    setQuality(0.8);
    setOutputType('image/webp');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handlePreviewKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreviewDialog();
      }
    };

    window.addEventListener('keydown', handlePreviewKeydown);
    return () => {
      revokePreviewUrl(originalPreviewUrl);
      revokePreviewUrl(processedPreviewUrl);
      closePreviewDialog();
      window.removeEventListener('keydown', handlePreviewKeydown);
    };
  }, [
    closePreviewDialog,
    originalPreviewUrl,
    processedPreviewUrl,
    revokePreviewUrl,
  ]);

  return (
    <BasicDetail title="图片工具箱" subtitle="本地压缩与格式转换">
      <div className="col-span-full">
        <div className="squircle border-border/60 bg-card/50 overflow-hidden border shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <aside className="border-border/60 w-full shrink-0 border-b p-6 lg:w-80 lg:border-r lg:border-b-0">
              <header className="mb-8">
                <h2 className="text-foreground text-xl font-bold">参数配置</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  本地处理，保护隐私安全
                </p>
              </header>

              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="max-width"
                      className="text-card-foreground text-sm font-semibold"
                    >
                      最大宽度限制
                    </label>
                    <input
                      checked={enableMaxWidth}
                      onChange={(event) =>
                        setEnableMaxWidth(event.target.checked)
                      }
                      type="checkbox"
                      className="border-border text-foreground focus:ring-ring h-4 w-4 rounded"
                    />
                  </div>
                  <div className="relative">
                    <input
                      id="max-width"
                      value={maxWidth}
                      onChange={(event) =>
                        setMaxWidth(Number(event.target.value))
                      }
                      type="number"
                      min={1}
                      disabled={!enableMaxWidth}
                      className="border-border bg-card focus:border-ring disabled:bg-secondary disabled:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:ring-0 focus:outline-none"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 text-xs">
                      px
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="quality"
                      className="text-card-foreground text-sm font-semibold"
                    >
                      压缩质量
                    </label>
                    <span className="text-muted-foreground font-mono text-xs font-medium">
                      {Math.round(quality * 100)}%
                    </span>
                  </div>
                  <input
                    id="quality"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                    type="range"
                    min={0.3}
                    max={1}
                    step={0.1}
                    className="bg-border accent-foreground h-1.5 w-full cursor-pointer appearance-none rounded-full"
                  />
                  <div className="text-muted-foreground flex justify-between text-[10px] uppercase">
                    <span>高压缩</span>
                    <span>原画</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-card-foreground text-sm font-semibold">
                    输出格式
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {outputTypes.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                          outputType === option.value
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card text-muted-foreground hover:border-border'
                        }`}
                        onClick={() => setOutputType(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-4">
                  <button
                    type="button"
                    disabled={!originalFile || processing}
                    className="group bg-foreground text-background hover:bg-foreground/90 relative overflow-hidden rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-60"
                    onClick={handleProcess}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        正在处理
                      </span>
                    ) : (
                      <span>开始处理</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!processedBlob}
                    className="border-border bg-card text-card-foreground hover:bg-accent flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all disabled:opacity-50"
                    onClick={downloadProcessedImage}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    下载结果
                  </button>

                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground py-2 text-xs font-medium"
                    onClick={resetAll}
                  >
                    清空并重置
                  </button>
                </div>
              </div>
            </aside>

            <main className="bg-secondary/50 flex-1 p-6">
              <div className="mx-auto max-w-5xl space-y-6">
                <div
                  ref={dropZoneRef}
                  className={`group relative flex min-h-50 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 ${
                    isDraggingOver
                      ? 'border-foreground bg-foreground/5'
                      : originalFile
                        ? 'bg-card border-transparent shadow-sm'
                        : 'border-border bg-card hover:border-border'
                  }`}
                  onClick={openFilePicker}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isDraggingOver && (
                    <div className="bg-foreground/5 absolute inset-0 animate-pulse" />
                  )}

                  <div className="relative z-10 p-8 text-center">
                    {!originalFile ? (
                      <div className="space-y-4">
                        <div className="bg-secondary text-muted-foreground mx-auto flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
                          <svg
                            className="h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-foreground text-base font-bold">
                            {isDraggingOver ? '即刻上传' : '点击或拖拽图片'}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            支持 JPG, PNG, WebP, GIF, AVIF (最大 20MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-muted h-12 w-12 overflow-hidden rounded-lg">
                            <img
                              src={originalPreviewUrl}
                              className="h-full w-full object-cover"
                              alt="original thumbnail"
                            />
                          </div>
                          <div className="text-left">
                            <p className="text-foreground max-w-50 truncate text-sm font-bold">
                              {originalFile.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatBytes(originalFile.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="bg-card text-card-foreground ring-border hover:bg-accent rounded-full px-4 py-1.5 text-xs font-bold shadow-sm ring-1 transition-all"
                          onClick={(event) => {
                            event.stopPropagation();
                            openFilePicker();
                          }}
                        >
                          更换图片
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {originalFile && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="group bg-card relative flex flex-col overflow-hidden rounded-3xl shadow-sm">
                      <div className="border-border flex items-center justify-between border-b p-4">
                        <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                          原始图像
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px]">
                            缩放: {Math.round(originalPreviewZoom * 100)}%
                          </span>
                          <button
                            onClick={() => setOriginalPreviewZoom(1)}
                            className="text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                      <div className="bg-secondary/50 relative flex min-h-[320px] items-center justify-center overflow-auto p-8">
                        <button
                          type="button"
                          className="cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                          onClick={() =>
                            openPreview(originalPreviewUrl, '原图预览')
                          }
                        >
                          <img
                            src={originalPreviewUrl}
                            alt="原图预览"
                            style={{
                              transform: `scale(${originalPreviewZoom})`,
                              transformOrigin: 'center center',
                            }}
                            className="max-h-60 w-auto max-w-none rounded-lg object-contain shadow-sm"
                          />
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-1/2 w-32 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                        <input
                          value={originalPreviewZoom}
                          onChange={(event) =>
                            setOriginalPreviewZoom(Number(event.target.value))
                          }
                          type="range"
                          min={1}
                          max={4}
                          step={0.1}
                          className="accent-foreground h-1 w-full"
                        />
                      </div>
                    </div>

                    <div className="group bg-card relative flex flex-col overflow-hidden rounded-3xl shadow-sm">
                      <div className="border-border flex items-center justify-between border-b p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                            处理后:{formatBytes(processedBlob?.size ?? 0)}
                          </span>
                          {processedBlob && (
                            <span className="bg-success/10 text-success rounded-full px-2 py-0.5 text-[10px] font-bold">
                              {compressionRatio} 节省
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px]">
                            缩放: {Math.round(processedPreviewZoom * 100)}%
                          </span>
                          <button
                            onClick={() => setProcessedPreviewZoom(1)}
                            className="text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                      <div className="bg-secondary/50 relative flex min-h-[320px] items-center justify-center overflow-auto p-8">
                        {processing ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="border-foreground h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                            <span className="text-muted-foreground text-xs">
                              正在渲染...
                            </span>
                          </div>
                        ) : processedPreviewUrl ? (
                          <button
                            type="button"
                            className="cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                            onClick={() =>
                              openPreview(processedPreviewUrl, '处理后预览')
                            }
                          >
                            <img
                              src={processedPreviewUrl}
                              alt="处理后预览"
                              style={{
                                transform: `scale(${processedPreviewZoom})`,
                                transformOrigin: 'center center',
                              }}
                              className="max-h-60 w-auto max-w-none rounded-lg object-contain shadow-sm"
                            />
                          </button>
                        ) : (
                          <div className="text-muted-foreground text-center">
                            <svg
                              className="mx-auto h-12 w-12 opacity-20"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            <p className="mt-2 text-xs">
                              调整参数后点击“开始处理”
                            </p>
                          </div>
                        )}
                      </div>
                      {processedPreviewUrl && (
                        <div className="absolute bottom-4 left-1/2 w-32 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                          <input
                            value={processedPreviewZoom}
                            onChange={(event) =>
                              setProcessedPreviewZoom(
                                Number(event.target.value),
                              )
                            }
                            type="range"
                            min={1}
                            max={4}
                            step={0.1}
                            className="accent-foreground h-1 w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <p className="bg-destructive/10 text-destructive mx-auto mt-6 max-w-md rounded-xl p-3 text-center text-xs font-medium">
                  {errorMessage}
                </p>
              )}
            </main>
          </div>
        </div>

        <AnimatePresence>
          {isPreviewDialogOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closePreviewDialog();
                }
              }}
            >
              <button
                type="button"
                className="bg-card/10 text-foreground hover:bg-card/20 absolute top-6 right-6 h-10 w-10 rounded-full transition-colors"
                onClick={closePreviewDialog}
              >
                ✕
              </button>
              <img
                src={previewDialogUrl}
                alt={previewDialogAlt}
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BasicDetail>
  );
}
