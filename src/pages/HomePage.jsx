import {
  ArrowRight,
  CalendarDays,
  Camera,
  Heart,
  Mail,
  MapPin,
  MessageCircleHeart,
  NotebookTabs,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'

import AlbumSection from '@/components/sections/album-section'
import TimelineSection from '@/components/sections/timeline-section'
import { buttonVariants } from '@/components/ui/button-variants'
import { heroContent, memoryStats, socialLinks, vows } from '@/data/site-content'

const iconMap = {
  Camera,
  Mail,
  NotebookTabs,
}

const riseIn = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fffaf8_0%,#fff3f2_38%,#fff8fb_100%)] text-[#6f3850]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 20%, rgba(255, 210, 222, 0.95), transparent 28%), radial-gradient(circle at 82% 18%, rgba(255, 240, 219, 0.9), transparent 24%), radial-gradient(circle at 50% 72%, rgba(247, 197, 216, 0.34), transparent 30%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.45), transparent 85%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-12 pt-6 sm:px-8 lg:px-10">
        <motion.header
          className="flex items-center justify-between rounded-full border border-white/60 bg-white/55 px-5 py-4 shadow-[0_20px_60px_rgba(212,146,170,0.14)] backdrop-blur-xl"
          initial="hidden"
          animate="visible"
          variants={riseIn}
          custom={0.05}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1f4] text-[#c45b85] shadow-inner shadow-white/70">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <div>
              <p
                className="text-xs uppercase tracking-[0.32em] text-[#c17895]"
                style={{ fontFamily: '"DM Sans", "Trebuchet MS", sans-serif' }}
              >
                Couple Space
              </p>
              <p
                className="text-lg text-[#7f314e]"
                style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
              >
                Moonlit Diary
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[#92536f] md:flex">
            <a className="transition hover:text-[#7a3150]" href="#album">
              我们的相册
            </a>
            <a className="transition hover:text-[#7a3150]" href="#timeline">
              恋爱时间轴
            </a>
            <a className="transition hover:text-[#7a3150]" href="#memories">
              纪念时刻
            </a>
            <a className="transition hover:text-[#7a3150]" href="#letters">
              悄悄话
            </a>
            <a className="transition hover:text-[#7a3150]" href="#connect">
              找到我们
            </a>
          </nav>
        </motion.header>

        <section className="relative grid flex-1 items-center gap-14 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-18">
          <motion.div
            className="relative z-10"
            initial="hidden"
            animate="visible"
            variants={riseIn}
            custom={0.15}
          >
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#b65d82] shadow-[0_14px_30px_rgba(204,128,157,0.14)] backdrop-blur"
              initial="hidden"
              animate="visible"
              variants={riseIn}
              custom={0.2}
            >
              <Sparkles className="h-4 w-4" />
              {heroContent.badge}
            </motion.div>

            <motion.p
              className="mt-8 text-sm uppercase tracking-[0.35em] text-[#ca85a1]"
              style={{ fontFamily: '"DM Sans", "Trebuchet MS", sans-serif' }}
              initial="hidden"
              animate="visible"
              variants={riseIn}
              custom={0.25}
            >
              {heroContent.subtitle}
            </motion.p>

            <motion.h1
              className="mt-4 max-w-3xl text-[3.4rem] leading-[0.94] text-[#6d2845] sm:text-[4.5rem] lg:text-[5.6rem]"
              style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
              initial="hidden"
              animate="visible"
              variants={riseIn}
              custom={0.35}
            >
              {heroContent.title}
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-base leading-8 text-[#8f5870] sm:text-lg"
              style={{ fontFamily: '"DM Sans", "Trebuchet MS", sans-serif' }}
              initial="hidden"
              animate="visible"
              variants={riseIn}
              custom={0.45}
            >
              {heroContent.description}
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-4 sm:flex-row"
              initial="hidden"
              animate="visible"
              variants={riseIn}
              custom={0.55}
            >
              <motion.a
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                href={heroContent.primaryAction.href}
                className={buttonVariants({ variant: 'romantic' })}
              >
                {heroContent.primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </motion.a>
              <motion.a
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                href={heroContent.secondaryAction.href}
                className={buttonVariants({ variant: 'outline' })}
              >
                <MessageCircleHeart className="h-4 w-4" />
                {heroContent.secondaryAction.label}
              </motion.a>
            </motion.div>

            <motion.div
              id="connect"
              className="mt-10 flex flex-wrap gap-3"
              initial="hidden"
              animate="visible"
              variants={riseIn}
              custom={0.65}
            >
              {socialLinks.map((item) => {
                const Icon = iconMap[item.icon]

                return (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.96 }}
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                )
              })}
            </motion.div>
          </motion.div>

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.85, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative rounded-[2rem] border border-white/60 bg-white/55 p-5 shadow-[0_28px_90px_rgba(186,112,140,0.18)] backdrop-blur-xl sm:p-7">
              <motion.div
                aria-hidden="true"
                animate={{ y: [0, -12, 0], rotate: [0, 4, -2, 0] }}
                transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="absolute -right-4 -top-6 rounded-full bg-[#fff4f8] px-5 py-3 text-sm text-[#be6789] shadow-[0_18px_40px_rgba(223,142,175,0.22)]"
              >
                love note no. 01
              </motion.div>

              <div className="rounded-[1.7rem] bg-[linear-gradient(160deg,rgba(255,250,247,0.96),rgba(255,235,240,0.86))] p-6 shadow-inner shadow-white/70">
                <div className="flex items-center justify-between text-[#af6787]">
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.24em]">
                    Dear Us
                  </span>
                  <Heart className="h-5 w-5 fill-current" />
                </div>

                <p
                  className="mt-8 text-4xl leading-none text-[#7b2d4b] sm:text-[3.6rem]"
                  style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
                >
                  我们把爱意写成慢慢发亮的四季。
                </p>

                <div id="letters" className="mt-8 grid gap-4">
                  {vows.map((vow) => (
                    <div
                      key={vow}
                      className="rounded-[1.5rem] border border-white/60 bg-white/72 p-4 text-sm leading-7 text-[#8e5870] shadow-[0_12px_30px_rgba(203,139,161,0.12)]"
                    >
                      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#c27897]">
                        <MapPin className="h-4 w-4" />
                        soft promise
                      </div>
                      {vow}
                    </div>
                  ))}
                </div>
              </div>

              <div id="memories" className="mt-6 grid gap-4 sm:grid-cols-3">
                {memoryStats.map((item, index) => (
                  <motion.article
                    key={item.label}
                    className="rounded-[1.6rem] border border-white/65 bg-white/72 p-5 shadow-[0_16px_36px_rgba(204,136,159,0.12)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.55 + index * 0.1 }}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#be6f91]">
                      <CalendarDays className="h-4 w-4" />
                      {item.label}
                    </div>
                    <p
                      className="mt-4 text-3xl text-[#742846]"
                      style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
                    >
                      {item.value}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#8f6074]">{item.note}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <AlbumSection />
        <TimelineSection />
      </div>
    </main>
  )
}

export default HomePage
