import { useNotificationStore } from '@/stores/notification';
import { ref, type Ref } from 'vue';
import type { Picture } from './useGallery';

interface LayoutSeed {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

interface UsePolaroidLayoutOptions {
  images: Ref<Picture[]>;
}

// Polaroid 堆叠布局算法：随机位置/旋转/尺寸，拖拽时提升 z-index
export const usePolaroidLayout = ({ images }: UsePolaroidLayoutOptions) => {
  // Random layout seeds (cached per image index)
  const layoutSeeds = ref<Map<number, LayoutSeed>>(new Map());

  // Max z-index to bring dragging items to front
  const maxZIndex = ref(10);

  // Generate random layout seeds for each image (Polaroid pile look)
  const generateLayoutSeeds = () => {
    layoutSeeds.value.clear();
    maxZIndex.value = images.value.length;
    images.value.forEach((_, index) => {
      // Keep them roughly within the center but scattered
      const xRange = Math.random() * 60 + 10; // 10-70% from left
      const yRange = Math.random() * 50 + 10; // 10-60% from top

      layoutSeeds.value.set(index, {
        x: xRange,
        y: yRange,
        rotation: (Math.random() - 0.5) * 30, // -15 to 15 degrees for casual scatter
        zIndex: index + 1,
      });
    });
  };

  // Shuffle images layout
  const shuffleImages = () => {
    generateLayoutSeeds();
    useNotificationStore().success('照片已重新洗牌');
  };

  const bringToFront = (index: number) => {
    const seed = layoutSeeds.value.get(index);
    if (seed) {
      maxZIndex.value += 1;
      seed.zIndex = maxZIndex.value;
    }
  };

  // Get style for each image card
  const getImageStyle = (index: number): Record<string, string | number> => {
    const seed = layoutSeeds.value.get(index);
    if (!seed) return {};
    return {
      left: `${seed.x}%`,
      top: `${seed.y}%`,
      zIndex: seed.zIndex,
    };
  };

  // Get consistent size for variety, slightly larger for polaroids
  const getImageSize = (index: number) => {
    const seed = (index * 137) % 100;
    return 220 + seed;
  };

  // Get aspect ratio, prefer standard photo formats
  const getAspectRatio = (index: number) => {
    const ratios = [1, 1.25, 0.8, 1.5]; // 1:1, 4:5, 5:4, 2:3
    return ratios[index % ratios.length];
  };

  // Get cached rotation for an image (kept stable across renders)
  const getRotation = (index: number) => {
    return layoutSeeds.value.get(index)?.rotation ?? 0;
  };

  return {
    layoutSeeds,
    generateLayoutSeeds,
    shuffleImages,
    bringToFront,
    getImageStyle,
    getImageSize,
    getAspectRatio,
    getRotation,
  };
};
