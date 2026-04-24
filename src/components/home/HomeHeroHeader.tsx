export default function HomeHeroHeader() {
  return (
    <header className="w-full md:max-w-5xl mt-4 mb-5 sm:mt-6 sm:mb-6 relative overflow-hidden">
      <div className="absolute inset-x-10 top-4 h-40 rounded-full bg-gradient-to-r from-pink-200/35 via-blue-100/40 to-emerald-100/30 blur-3xl dark:from-pink-900/20 dark:via-blue-900/20 dark:to-emerald-900/10" />
      <div className="relative z-10 rounded-[2rem] border border-white/70 bg-white/75 px-5 py-8 text-center shadow-[0_20px_80px_rgba(236,72,153,0.12)] backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-800/75 sm:px-8 sm:py-10">
        <div className="mx-auto mb-5 flex h-24 w-24 animate-float items-center justify-center rounded-[2rem] border border-pink-100 bg-white shadow-lg shadow-pink-100/60 dark:border-gray-600 dark:bg-gray-800">
          <div className="grid grid-cols-4 gap-2">
            {[
              'bg-rose-400', 'bg-blue-400', 'bg-amber-400', 'bg-green-400',
              'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400',
              'bg-indigo-400', 'bg-cyan-400', 'bg-lime-400', 'bg-yellow-400',
              'bg-red-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400',
            ].map((color, index) => (
              <span key={index} className={`h-3.5 w-3.5 rounded-full ${color} shadow-sm`} />
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-pink-400 dark:text-pink-300">
            For Tingting
          </p>
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 sm:text-6xl">
            婷婷的拼豆工坊
          </h1>
          <p className="mt-3 text-base font-semibold text-sky-500 dark:text-sky-300 sm:text-2xl">
            拼豆图纸与作品小站
          </p>
          <p className="mt-4 text-sm leading-7 text-gray-500 dark:text-gray-300 sm:text-base">
            这里把喜欢的图片整理成拼豆底稿，自动统计色号数量，方便婷婷做作品、留档和回看每一次完成的成果。
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
          <span className="rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-pink-600 dark:border-pink-800/60 dark:bg-pink-900/20 dark:text-pink-200">
            上传图片自动生成底稿
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sky-600 dark:border-sky-800/60 dark:bg-sky-900/20 dark:text-sky-200">
            色号统计更适合做作品记录
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200">
            下载图纸不带外部宣传和二维码
          </span>
        </div>
      </div>
    </header>
  );
}
