import { BentoSocial } from '@/components/bento/BentoSocial';
import { motion } from 'framer-motion';

const AboutIMG = '/images/about.webp';

const techStack = [
  'Python',
  'FastApi',
  'Vue3',
  'React',
  'TypeScript',
  'PostgreSQL',
  'Redis',
  'MongoDB',
  'TailwindCSS',
];

const techDirections = ['Web 开发', '前后端分离', 'Python 数据分析'];

export default function AboutView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-20 flex h-full w-full flex-col items-center bg-gray-50/95 px-4 py-8 dark:bg-gray-900/95"
    >
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-10 flex flex-col items-center"
      >
        {/* Avatar */}
        <div className="group relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl transition duration-500 group-hover:from-blue-500/30 group-hover:to-purple-500/30" />
          <img
            src={AboutIMG}
            alt="Kuroome"
            className="relative h-28 w-28 rounded-full border-2 border-white/50 object-cover shadow-2xl transition duration-500 group-hover:scale-105 dark:border-slate-700"
          />
        </div>

        {/* Name & Tagline */}
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Kuroome
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          全栈开发者 · 读书爱好者
        </p>
      </motion.div>

      {/* Bio Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
        className="mb-6 w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-800/50"
      >
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          你好！欢迎来到我的博客。这个网站是我的第一个 Web
          项目，正在持续迭代完善中。
        </p>
      </motion.div>

      {/* Tech Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
        className="mb-6 w-full max-w-md"
      >
        <h2 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          技术栈
        </h2>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech, i) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.03, duration: 0.3 }}
              className="cursor-default rounded-full bg-blue-50/80 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {tech}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Directions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
        className="mb-6 w-full max-w-md"
      >
        <h2 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          技术方向
        </h2>
        <div className="flex flex-wrap gap-2">
          {techDirections.map((dir, i) => (
            <motion.span
              key={dir}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
              className="cursor-default rounded-full bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              {dir}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Hobbies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
        className="mb-8 w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-800/50"
      >
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          兴趣爱好
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          编程、阅读、钓鱼
        </p>
      </motion.div>

      {/* Connect Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        <h2 className="mb-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          联系我
        </h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          如果你有任何建议或想法，欢迎与我交流
        </p>
        <BentoSocial />
      </motion.div>
    </motion.div>
  );
}
