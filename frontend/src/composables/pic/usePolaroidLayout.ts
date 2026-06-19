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
      // 以容器中心为基准的小幅随机偏移，形成"堆"而非"撒"
      // x/y 均值 50%（几何中心），±12% 抖动保证集中在中间
      layoutSeeds.value.set(index, {
        x: 50 + (Math.random() - 0.5) * 24, // 38-62% from left
        y: 50 + (Math.random() - 0.5) * 20, // 40-60% from top
        rotation: (Math.random() - 0.5) * 24, // ±12°, 更接近随手散落的手感
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
      // 用独立 CSS `translate` 属性做居中补偿，而非 `transform`
      // motion-v 的 animate.rotate 走 transform，二者叠加不冲突
      translate: '-50% -50%',
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
