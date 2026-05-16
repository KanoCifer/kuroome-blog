import { socialGateway } from '@/api/socialGateway';
import animationData from '@/assets/Success Micro Interaction.json';
import { BentoCard } from '@/components/bento/BentoCard';
import { useNotificationStore } from '@/stores/notificationState';
import { motion } from 'framer-motion';
import { useLottie } from 'lottie-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';


const VUE_SITE_URL = 'https://kanocifer.chat';

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function switchToVue() {
  setCookie('device_force', 'vue', 30);
  window.location.href = VUE_SITE_URL;
}

function LikeAnimation() {
  const style = {
    width: 40,
    height: 40,
  };

  const { View, playSegments, goToAndPlay } = useLottie(
    {
      animationData: animationData,
      loop: false,
      autoplay: false,
    },
    style,
  );

  // 初始化时立即跳到最后一帧并停止
  useEffect(() => {
    const t = setTimeout(() => {
      playSegments([0, 90], true); // 播放 0→90 帧后停止在末帧
    }, 16);
    return () => clearTimeout(t);
  }, [playSegments]);

  const handleClick = () => {
    goToAndPlay(0, true); // 从头开始播放动画
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {View}
    </div>
  );
}

export function BentoProfile() {
  const [likesCount, setLikesCount] = useState<number>(0);
  const notifySuccess = useNotificationStore((state) => state.success);
  const notifyError = useNotificationStore((state) => state.error);

  useEffect(() => {
    let isMounted = true;
    socialGateway
      .getLikes()
      .then((data) => {
        if (isMounted && typeof data?.likes_count === 'number') {
          setLikesCount(data.likes_count);
        }
      })
      .catch(() => {
        /* ignore errors */
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLike = async () => {
    await socialGateway
      .likeOnce({ likes_count: 1 })
      .then(() => {
        notifySuccess('谢谢你的喜欢！🌹');
        setLikesCount((prev) => prev + 1);
      })
      .catch((err) => {
        // console.error('Error liking:', err);
        // console.log('Error response:', err.response);
        if (err.response?.status === 429) {
          notifyError('今天已经点了很多次了哦🌹！');
          return;
        }
        notifyError('Failed to like. Please try again later.');
      });
  };

  return (
    <BentoCard>
      <div className="relative flex items-center gap-5">
        {/* <!-- Avatar with Glow --> */}
        <div className="relative shrink-0">
          {/* 青/蓝色渐变 */}
          <div className="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"></div>
          <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/50 dark:ring-slate-700/50">
            <img
              src="/images/about.webp"
              alt="Kuroome"
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          </div>
          <div className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-100 dark:border-slate-800 dark:bg-green-900">
            <svg
              className="h-3 w-3 text-green-600 dark:text-green-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <Link to="/about" className="absolute inset-0 rounded-full"></Link>
        </div>

        {/* <!-- Content --> */}
        <div className="flex flex-col items-start text-left">
          <h2 className="font-serif text-2xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100">
            Kuroome
          </h2>
          <p className="font-medium text-gray-600 dark:text-gray-400">
            Developer
          </p>

        </div>

        {/* 点赞按钮 */}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="切换到 Vue 版本"
          className="absolute top-1/2 right-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-gray-50/80 ring-1 ring-gray-300 dark:bg-slate-800/40 dark:ring-gray-700"
          onClick={switchToVue}
        >
          <svg viewBox="0 0 256 221" className="h-4 w-4" fill="currentColor">
            <path d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36Z" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="喜欢这个网站吗？点个赞吧！"
          className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-gray-50/80 p-1 ring-1 ring-gray-300 dark:bg-blue-900/40 dark:ring-gray-700"
          onClick={handleLike}
        >
          <LikeAnimation />
          <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white dark:bg-red-400 dark:text-gray-200">
            {likesCount}
          </span>
        </motion.button>
      </div>
    </BentoCard>
  );
}
