import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { BentoCard } from '@/components/bento/BentoCard';
import { BentoSocial } from '@/components/bento/BentoSocial';

const AboutIMG = '/images/about.webp';

const techStack = [
  'Python',
  'JS/TS',
  'TaskIQ',
  'FastApi',
  'HTML/CSS/TailwindCSS',
  'PostgreSQL',
  'Vue3',
  'Redis',
  'MongoDB',
];

const techDirections = ['Web 开发', '前后端', 'Python数据分析'];

const hobbies = ['编程、阅读、钓鱼'];

export default function AboutView() {
  return (
    <div className="mx-auto my-auto flex max-w-6xl flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
        className="mx-auto mt-20 flex w-full max-w-6xl flex-col items-center justify-center"
      >
        <BentoCard className="w-full p-6 md:p-12">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-12">
            <div className="group relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-linear-to-br from-pink-200 to-blue-200 opacity-50 blur transition duration-500 group-hover:opacity-75 dark:from-pink-400/30 dark:to-blue-400/30" />
              <img
                src={AboutIMG}
                alt="Kuroome"
                className="relative h-32 w-32 transform rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105 md:h-48 md:w-48 dark:border-gray-800"
              />
            </div>

            <div className="hidden h-48 w-px bg-stone-600/80 dark:bg-stone-100/80 md:block" />

            <div className="flex-1 space-y-5 text-center md:text-left">
              <div className="space-y-4 text-base leading-relaxed text-gray-600 md:text-lg dark:text-gray-300">
                <p>
                  <span className="text-xl font-bold md:text-2xl">
                    我是 Kuroome。
                  </span>
                  <span className="block pt-1">
                    你好！欢迎来到我的博客。很多内容正在建设中...
                  </span>
                </p>
                <p>这个网站是我的第一个web项目。</p>

                <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:justify-start">
                  <span className="shrink-0">主要技术栈包括</span>
                  {techStack.map((tech, i) => (
                    <span
                      key={tech}
                      className="cursor-default font-medium text-gray-800 underline decoration-blue-400/60 decoration-2 underline-offset-2 transition-colors hover:decoration-pink-400 dark:text-gray-100"
                    >
                      {tech}
                      {i < techStack.length - 1 && '、'}
                    </span>
                  ))}
                  <span className="shrink-0">等。</span>
                </p>

                <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:justify-start">
                  <span className="shrink-0">技术方向包含</span>
                  {techDirections.map((dir, i) => (
                    <span
                      key={dir}
                      className="cursor-default font-medium text-gray-800 underline decoration-blue-400/60 decoration-2 underline-offset-2 transition-colors hover:decoration-pink-400 dark:text-gray-100"
                    >
                      {dir}
                      {i < techDirections.length - 1 && '、'}
                    </span>
                  ))}
                  <span className="shrink-0">等。</span>
                </p>

                <p>
                  我的兴趣爱好广泛，涵盖
                  <span className="cursor-default font-medium text-gray-800 underline decoration-blue-400/60 decoration-2 underline-offset-2 transition-colors hover:decoration-pink-400 dark:text-gray-100">
                    {hobbies}
                  </span>
                  等多个领域。
                </p>

                <p className="text-sm md:text-base">
                  这个博客主要用来记录我的学习、读书、生活点滴，希望你能喜欢！如果你有任何建议或想法，欢迎通过下面的联系方式与我交流。
                </p>
              </div>

              <div className="flex items-center justify-center gap-5 pt-3 md:justify-start">
                <span className="text-sm font-medium text-gray-400">
                  联系方式：
                </span>

                <a
                  href="https://github.com/KanoCifer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-gray-400 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md dark:bg-slate-700 dark:text-gray-400 dark:hover:text-white"
                  title="GitHub"
                  aria-label="GitHub"
                >
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
                    />
                  </svg>
                </a>

                <a
                  href="mailto:kano3255@outlook.com"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-gray-400 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md dark:bg-slate-700 dark:text-gray-400 dark:hover:text-white"
                  title="Email"
                  aria-label="Email"
                >
                  <Mail className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
        </BentoCard>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-4 w-full max-w-sm"
        >
          <BentoSocial />
        </motion.div>
      </motion.div>
    </div>
  );
}
