import { socialGateway } from '@/api/socialGateway';
import animationData from '@/assets/Success Micro Interaction.json';
import { BentoCard } from '@/components/bento/BentoCard';
import { useNotificationStore } from '@/stores/notificationState';
import dayjs from 'dayjs';
import { useLottie } from 'lottie-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    width: 36,
    height: 36,
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

export function BentoHero() {
  const [likesCount, setLikesCount] = useState<number>(0);
  const notifySuccess = useNotificationStore((state) => state.success);
  const notifyError = useNotificationStore((state) => state.error);
  const navigate = useNavigate();

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
        if (err.response?.status === 429) {
          notifyError('今天已经点了很多次了哦🌹！');
          return;
        }
        notifyError('Failed to like. Please try again later.');
      });
  };

  const greeting =
    dayjs().hour() < 12
      ? 'Good Morning'
      : dayjs().hour() < 18
        ? 'Good Afternoon'
        : 'Good Evening';

  const isEvening = dayjs().hour() >= 18 || dayjs().hour() < 6;

  return (
    <BentoCard className="border-primary/30! from-primary to-primary/60 relative overflow-hidden bg-linear-to-br p-7 shadow-xl">
      <div className="relative z-10 flex items-center gap-5">
        {/* Avatar with Glow */}
        <div className="relative shrink-0">
          <div className="from-primary-300 absolute -inset-1 rounded-full bg-linear-to-br to-blue-400 opacity-50 blur"></div>
          <div className="ring-primary-foreground/40 relative h-20 w-20 overflow-hidden rounded-full ring-4">
            <img
              src="/images/about.webp"
              alt="Kuroome"
              loading="eager"
              fetchPriority="high"
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          </div>
          <div className="bg-primary-foreground/20 border-primary-foreground absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2">
            <svg
              className="text-primary h-3 w-3"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <Link to="/about" className="absolute inset-0 rounded-full"></Link>
        </div>

        {/* Greeting + name */}
        <div className="min-w-0 flex-1">
          <p className="text-primary-foreground/70 text-xs font-medium tracking-wide">
            {greeting}
          </p>
          <h2 className="text-primary-foreground font-serif text-2xl leading-tight font-extrabold tracking-tight">
            Kuroome
          </h2>
          <p className="text-primary-foreground/80 mt-0.5 text-sm font-medium">
            Developer · Ready for a productive session?
          </p>
        </div>

        {/* Action cluster */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            title="切换到 Vue 版本"
            className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-90"
            onClick={switchToVue}
          >
            <svg viewBox="0 0 256 221" className="h-4 w-4" fill="currentColor">
              <path d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36Z" />
            </svg>
          </button>
          <button
            title="喜欢这个网站吗？点个赞吧！"
            className="bg-primary-foreground/15 hover:bg-primary-foreground/25 relative flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-90"
            onClick={handleLike}
          >
            <LikeAnimation />
            <span className="bg-destructive absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
              {likesCount}
            </span>
          </button>
        </div>
      </div>

      {/* CTA row */}
      <div className="relative z-10 mt-5 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/todos')}
          className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-full px-5 py-2 text-sm font-semibold backdrop-blur-md transition-all active:scale-95"
        >
          Check Today's Tasks
        </button>
        <span className="text-primary-foreground/60 text-xs font-medium tracking-wide">
          {dayjs().format('dddd')}
        </span>
      </div>

      {/* Decorative */}
      <div className="bg-primary-foreground/10 absolute -top-12 -right-12 h-44 w-44 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-3 -translate-y-1/2 opacity-10">
        {isEvening ? (
          <svg
            className="text-primary-foreground h-20 w-20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="text-primary-foreground h-20 w-20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>
        )}
      </div>
    </BentoCard>
  );
}
