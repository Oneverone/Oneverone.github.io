import { Heart, MapPin, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

import { albumPhotos } from '@/data/site-content'

const cardOffsets = [
  'md:mt-10',
  '',
  'xl:mt-14',
  'md:mt-6',
  'xl:-mt-8',
  'md:mt-12',
]

function AlbumSection() {
  return (
    <section
      id="album"
      className="relative z-10 mt-8 rounded-[2.5rem] border border-white/55 bg-white/42 px-6 py-8 shadow-[0_26px_90px_rgba(202,132,161,0.16)] backdrop-blur-xl sm:px-8 sm:py-10 lg:mt-14 lg:px-10 lg:py-12"
    >
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="lg:sticky lg:top-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/68 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#b86689] shadow-[0_12px_30px_rgba(205,140,166,0.15)]">
            <Sparkles className="h-4 w-4" />
            Our Gallery
          </div>

          <h2
            className="mt-6 text-5xl leading-[0.92] text-[#6d2845] sm:text-6xl"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            我们的相册
          </h2>

          <p
            className="mt-5 max-w-md text-base leading-8 text-[#8f5a72] sm:text-lg"
            style={{ fontFamily: '"DM Sans", "Trebuchet MS", sans-serif' }}
          >
            把一起路过的傍晚、花店、海边和厨房都剪成柔软的小片段，让第二屏像一本会呼吸的合照集。
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/65 bg-white/70 p-5 shadow-[0_16px_40px_rgba(205,142,166,0.12)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#be6f91]">珍藏张数</p>
              <p
                className="mt-3 text-4xl text-[#752745]"
                style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
              >
                06
              </p>
              <p className="mt-2 text-sm leading-7 text-[#956379]">
                每一张都保留一点风、光线，和当时看向彼此的眼神。
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/65 bg-[linear-gradient(180deg,rgba(255,246,248,0.95),rgba(255,236,242,0.86))] p-5 shadow-[0_16px_40px_rgba(205,142,166,0.12)]">
              <div className="flex items-center gap-2 text-[#be6f91]">
                <Heart className="h-4 w-4 fill-current" />
                <p className="text-xs uppercase tracking-[0.24em]">相册注脚</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#8f5d72]">
                有些照片并不完美，却正好把最真实的亲密感轻轻保存下来。
              </p>
            </div>
          </div>
        </motion.div>

        <div className="columns-1 gap-5 md:columns-2 xl:columns-3 [&>article]:mb-5">
          {albumPhotos.map((photo, index) => (
            <motion.article
              key={photo.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, rotate: index % 2 === 0 ? -1 : 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={`break-inside-avoid overflow-hidden rounded-[2rem] border border-white/65 bg-white/76 p-3 shadow-[0_20px_60px_rgba(200,129,156,0.14)] backdrop-blur-sm ${cardOffsets[index % cardOffsets.length]}`}
            >
              <div className="overflow-hidden rounded-[1.5rem]">
                <img
                  src={photo.image}
                  alt={`${photo.title}，情侣合照场景`}
                  className="h-auto w-full rounded-[1.5rem] object-cover transition duration-500 hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>

              <div className="px-2 pb-2 pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      className="text-[1.9rem] leading-none text-[#742846]"
                      style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
                    >
                      {photo.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#916074]">{photo.note}</p>
                  </div>
                  <span className="rounded-full bg-[#fff1f4] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#bc6e90]">
                    {photo.moment}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#c47a99]">
                  <MapPin className="h-4 w-4" />
                  {photo.location}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AlbumSection
