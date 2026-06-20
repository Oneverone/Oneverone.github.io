import { CalendarHeart, Heart, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

import { loveTimeline } from '@/data/site-content'

function TimelineSection() {
  return (
    <section
      id="timeline"
      className="relative z-10 mt-8 overflow-hidden rounded-[2.5rem] border border-white/55 bg-[linear-gradient(180deg,rgba(255,250,251,0.78),rgba(255,241,245,0.62))] px-6 py-8 shadow-[0_28px_90px_rgba(196,122,151,0.16)] backdrop-blur-xl sm:px-8 sm:py-10 lg:mt-14 lg:px-10 lg:py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 20%, rgba(255,255,255,0.9), transparent 28%), radial-gradient(circle at 80% 74%, rgba(255,224,233,0.72), transparent 24%)',
        }}
      />

      <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="lg:sticky lg:top-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#b76588] shadow-[0_12px_30px_rgba(205,140,166,0.14)]">
            <CalendarHeart className="h-4 w-4" />
            Love Timeline
          </div>

          <h2
            className="mt-6 text-5xl leading-[0.92] text-[#6d2845] sm:text-6xl"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            恋爱时间轴
          </h2>

          <p
            className="mt-5 max-w-md text-base leading-8 text-[#8f5a72] sm:text-lg"
            style={{ fontFamily: '"DM Sans", "Trebuchet MS", sans-serif' }}
          >
            用一条缓缓延伸的时间线，把相遇、约会、旅行和周年纪念串成一段发着微光的故事。
          </p>

          <div className="mt-8 rounded-[1.8rem] border border-white/65 bg-white/72 p-5 shadow-[0_16px_40px_rgba(205,142,166,0.12)]">
            <div className="flex items-center gap-2 text-[#be6f91]">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.24em]">时间注脚</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#8f5d72]">
              比起轰轰烈烈，真正珍贵的是那些被好好记住的小日子，它们慢慢把我们变成了“我们”。
            </p>
          </div>
        </motion.div>

        <div className="relative pl-8 sm:pl-10">
          <div className="absolute bottom-6 left-3 top-6 w-px bg-[linear-gradient(180deg,rgba(221,153,178,0.15),rgba(190,111,145,0.9),rgba(221,153,178,0.15))] sm:left-4" />

          <div className="grid gap-5">
            {loveTimeline.map((item, index) => (
              <motion.article
                key={`${item.date}-${item.title}`}
                initial={{ opacity: 0, x: 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.65, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative rounded-[1.9rem] border border-white/70 bg-white/78 p-5 shadow-[0_18px_46px_rgba(202,131,158,0.12)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(193,118,147,0.18)] sm:p-6"
              >
                <div className="absolute left-[-2.3rem] top-7 flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-[#fff1f5] text-[#c56f92] shadow-[0_10px_24px_rgba(199,126,153,0.16)] sm:left-[-2.7rem]">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#bf7293]">{item.tag}</p>
                    <h3
                      className="mt-3 text-[2rem] leading-none text-[#742846] sm:text-[2.2rem]"
                      style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <span className="w-fit rounded-full bg-[#fff2f6] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#be6f91]">
                    {item.date}
                  </span>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#916074] sm:text-[15px]">
                  {item.note}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TimelineSection
