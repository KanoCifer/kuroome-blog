import {
  galleryService,
  type GalleryService,
  type Picture,
} from '@/services/galleryService';
import { useAuthStore } from '@/stores/authState';
import { useNotificationStore } from '@/stores/notificationState';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Check,
  Edit2,
  ImageOff,
  ImagePlus,
  Loader2,
  Maximize2,
  Shuffle,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface LayoutSeed {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

function createPictureId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export default function PicGalleryView() {
  const auth = useAuthStore();
  const notifier = useNotificationStore();
  const serviceRef = useRef<GalleryService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = galleryService();
  }
  const service = serviceRef.current;
  const canEdit = Boolean(auth.user?.is_admin);

  const [images, setImages] = useState<Picture[]>([]);
  const [layoutSeeds, setLayoutSeeds] = useState<Map<number, LayoutSeed>>(
    new Map(),
  );

  const galleryRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedImage = useMemo(
    () => images.find((img) => img.id === selectedImageId) ?? null,
    [images, selectedImageId],
  );

  const generateLayoutSeeds = useCallback((sourceImages: Picture[]) => {
    const nextSeeds = new Map<number, LayoutSeed>();
    sourceImages.forEach((_, index) => {
      nextSeeds.set(index, {
        x: Math.random() * 60 + 10,
        y: Math.random() * 50 + 8,
        rotation: (Math.random() - 0.5) * 30,
        zIndex: index + 1,
      });
    });
    setLayoutSeeds(nextSeeds);
  }, []);

  const fetchGalleryImages = useCallback(async () => {
    try {
      const data = await service.getGallery();
      setImages(data.images);
      generateLayoutSeeds(data.images);
    } catch {
      notifier.error('获取照片墙数据失败');
    }
  }, [generateLayoutSeeds, notifier, service]);

  useEffect(() => {
    void fetchGalleryImages();
  }, [fetchGalleryImages]);

  useEffect(() => {
    if (!canEdit) {
      setIsEditMode(false);
      setShowUploadModal(false);
    }
  }, [canEdit]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const ensureAdminPermission = useCallback(() => {
    if (!canEdit) {
      notifier.error('仅管理员可编辑图片');
      return false;
    }
    return true;
  }, [canEdit, notifier]);

  const saveGallery = useCallback(
    async (nextImages: Picture[]) => {
      await service.saveGallery({
        images: nextImages.map((img) => ({
          id: img.id,
          url: img.url,
          description: img.description,
          uploadedAt: img.uploadedAt,
        })),
      });
    },
    [service],
  );

  const toggleEditMode = () => {
    if (!ensureAdminPermission()) return;
    setIsEditMode((prev) => !prev);
  };

  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadDescription('');
    setIsDragging(false);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  const openUploadModal = () => {
    if (!ensureAdminPermission()) return;
    setShowUploadModal(true);
  };

  const openImageDetail = (image: Picture) => {
    setSelectedImageId(image.id);
    setEditDescription(image.description);
  };

  const closeImageDetail = () => {
    setSelectedImageId(null);
    setEditDescription('');
  };

  const shuffleImages = () => {
    if (!ensureAdminPermission()) return;
    generateLayoutSeeds(images);
    notifier.success('照片已重新洗牌');
  };

  const bringToFront = (index: number) => {
    setLayoutSeeds((prevSeeds) => {
      const currentMaxZ =
        prevSeeds.size > 0
          ? Math.max(
              ...Array.from(prevSeeds.values()).map((seed) => seed.zIndex),
            )
          : 10;
      const nextZ = currentMaxZ + 1;
      const nextSeeds = new Map(prevSeeds);
      const seed = nextSeeds.get(index);
      if (seed) {
        nextSeeds.set(index, { ...seed, zIndex: nextZ });
      }
      return nextSeeds;
    });
  };

  const getImageStyle = (index: number) => {
    const seed = layoutSeeds.get(index);
    if (!seed) return {};
    return {
      left: `${seed.x}%`,
      top: `${seed.y}%`,
      zIndex: seed.zIndex,
    };
  };

  const getImageSize = (index: number) => {
    const seed = (index * 137) % 100;
    return 120 + (seed % 46);
  };

  const getAspectRatio = (index: number) => {
    const ratios = [1, 1.25, 0.8, 1.5];
    return ratios[index % ratios.length];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('YYYY年MM月DD日 HH:mm');
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartPosRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePhotoClick = (image: Picture, event: React.MouseEvent) => {
    const dx = Math.abs(event.clientX - dragStartPosRef.current.x);
    const dy = Math.abs(event.clientY - dragStartPosRef.current.y);
    if (dx > 5 || dy > 5) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    openImageDetail(image);
  };

  const processFile = (file: File) => {
    if (!canEdit) return;
    if (!file.type.startsWith('image/')) {
      notifier.error('请选择图片文件');
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      notifier.error('图片大小不能超过 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  const triggerFileInput = () => {
    if (!canEdit) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const uploadImage = async () => {
    if (!ensureAdminPermission()) return;
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadedUrl = await service.uploadGalleryImage(formData);

      const newImage: Picture = {
        id: createPictureId(),
        uploadedAt: dayjs().toISOString(),
        url: uploadedUrl,
        description: uploadDescription.trim(),
      };
      const nextImages = [...images, newImage];

      await saveGallery(nextImages);
      setImages(nextImages);
      generateLayoutSeeds(nextImages);
      notifier.success('图片上传成功');
      closeUploadModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '图片上传或保存失败';
      notifier.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const updateDescription = async () => {
    if (!ensureAdminPermission()) return;
    if (!selectedImage) return;

    const nextImages = images.map((img) =>
      img.id === selectedImage.id
        ? { ...img, description: editDescription.trim() }
        : img,
    );

    try {
      await saveGallery(nextImages);
      setImages(nextImages);
      notifier.success('描述已更新');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败';
      notifier.error(message);
    }
  };

  const deleteImage = async (id: string) => {
    if (!ensureAdminPermission()) return;
    const nextImages = images.filter((img) => img.id !== id);
    try {
      await saveGallery(nextImages);
      setImages(nextImages);
      generateLayoutSeeds(nextImages);
      closeImageDetail();
      notifier.success('图片已删除');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败';
      notifier.error(message);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background pb-40">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #9ca3af 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 px-4 pt-6">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Mobile Gallery
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            图片墙
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            拖拽照片自由排布，点击查看详情
          </p>
        </div>
      </div>

      <div
        ref={galleryRef}
        className="relative z-10 mx-auto mt-3 h-[72dvh] w-full max-w-md px-4"
      >
        {images.map((image, index) => {
          const seed = layoutSeeds.get(index);
          return (
            <motion.div
              key={image.id}
              className={`absolute origin-center ${
                isEditMode && canEdit
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-pointer'
              }`}
              style={getImageStyle(index)}
              initial={{
                opacity: 0,
                scale: 0.8,
                rotate: (seed?.rotation ?? 0) - 10,
                y: 50,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: seed?.rotation ?? 0,
                y: 0,
              }}
              transition={{
                duration: 0.7,
                delay: index * 0.04,
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              whileHover={{
                scale: 1.05,
                zIndex: 120,
                transition: { duration: 0.2 },
              }}
              whileDrag={
                isEditMode && canEdit
                  ? {
                      scale: 1.08,
                      zIndex: 180,
                      rotate: 0,
                      transition: {
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      },
                    }
                  : undefined
              }
              drag
              dragConstraints={galleryRef}
              dragElastic={0.2}
              dragMomentum={false}
              onDragStart={() => bringToFront(index)}
              onPointerDown={handlePointerDown}
              onClick={(event) => handlePhotoClick(image, event)}
            >
              <div
                className="group relative flex flex-col items-center rounded-sm bg-card p-2 shadow-xl ring-1 ring-border transition-shadow hover:shadow-2xl"
                style={{ width: `${getImageSize(index) + 16}px` }}
              >
                <div
                  className="relative w-full overflow-hidden rounded-sm bg-muted"
                  style={{
                    height: `${getImageSize(index) * getAspectRatio(index)}px`,
                  }}
                >
                  <img
                    src={image.url}
                    alt={image.description || 'gallery image'}
                    className="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    draggable={false}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="translate-y-3 transform rounded-full bg-white/20 p-2.5 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <Maximize2 className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {images.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="w-full max-w-xs rounded-[2rem] border border-border/80 bg-card/70 p-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl"
            >
              <div className="mx-auto mb-6 flex h-18 w-18 items-center justify-center rounded-2xl bg-linear-to-tr from-primary/10 to-primary/10 text-primary shadow-inner">
                <ImageOff className="h-9 w-9" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                还没有图片
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                你的图片墙还是空白，上传第一张照片吧
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="mt-6 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90"
                  onClick={openUploadModal}
                >
                  开始上传
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-1/2 z-40 w-fit -translate-x-1/2">
          <div className="rounded-2xl border border-border/50 bg-card/85 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleEditMode}
                className={`flex h-10 items-center gap-2 rounded-xl border border-border/70 px-3 text-sm shadow-sm ${
                  isEditMode
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground'
                }`}
              >
                {isEditMode ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Edit2 className="h-4 w-4" />
                )}
                {isEditMode ? '完成编辑' : '编辑模式'}
              </button>

              {isEditMode && (
                <>
                  <button
                    type="button"
                    onClick={shuffleImages}
                    className="flex h-10 items-center rounded-xl border border-border/70 px-3 text-foreground shadow-sm"
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={openUploadModal}
                    className="flex h-10 items-center rounded-xl bg-foreground px-3 text-background shadow-sm transition-colors hover:bg-foreground/90"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeImageDetail}
          >
            <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] bg-card/95 shadow-2xl ring-1 ring-border backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeImageDetail}
                className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/10 text-muted-foreground backdrop-blur-md transition-all hover:scale-105 hover:bg-background/20 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative flex max-h-[62dvh] w-full items-center justify-center bg-muted/50 p-4">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.description || 'detail image'}
                  className="h-auto max-h-full w-auto max-w-full rounded-xl object-contain shadow-lg ring-1 ring-border"
                />
              </div>

              <div className="space-y-4 bg-card/60 p-5">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  {formatDate(selectedImage.uploadedAt)}
                </div>

                {canEdit && isEditMode ? (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      修改描述
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(event) =>
                        setEditDescription(event.target.value)
                      }
                      rows={3}
                      placeholder="输入新的描述..."
                      className="w-full resize-none rounded-xl border border-border/80 bg-card px-4 py-3 text-sm text-foreground placeholder-muted-foreground shadow-sm transition-all focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-full px-4 py-2 text-sm text-destructive shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteImage(selectedImage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除图片
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-foreground px-5 py-2 text-sm text-background shadow-sm transition-colors hover:bg-foreground/90"
                        onClick={updateDescription}
                      >
                        保存修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/80 p-4 text-base whitespace-pre-wrap text-card-foreground">
                    {selectedImage.description || '暂无描述'}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUploadModal && canEdit && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeUploadModal}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-md rounded-[2rem] bg-card/95 p-6 shadow-2xl ring-1 ring-border backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeUploadModal}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  上传新图片
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  添加到你的照片墙
                </p>
              </div>

              <div
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-secondary/50 p-8 text-center transition-all hover:border-border hover:bg-secondary ${
                  isDragging
                    ? 'scale-[0.98] border-foreground bg-secondary'
                    : ''
                }`}
                onClick={triggerFileInput}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {previewUrl ? (
                  <div className="relative w-full">
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="mx-auto max-h-48 rounded-xl object-contain shadow-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
                        更换图片
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border transition-transform group-hover:scale-110">
                      <ImagePlus
                        className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-sm font-medium text-card-foreground">
                      点击或拖拽图片到此处
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      支持 JPG、PNG、GIF、WebP (最大 5MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  照片描述（可选）
                </label>
                <input
                  value={uploadDescription}
                  onChange={(event) => setUploadDescription(event.target.value)}
                  type="text"
                  placeholder="为这张图片添加描述..."
                  className="mt-2 w-full rounded-xl border border-border/80 bg-card px-4 py-3 text-sm text-foreground placeholder-muted-foreground shadow-sm transition-all focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent"
                  onClick={closeUploadModal}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center rounded-xl bg-foreground py-3 text-sm font-medium text-background shadow-md transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedFile || isUploading}
                  onClick={uploadImage}
                >
                  {isUploading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isUploading ? '上传中...' : '确认上传'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
