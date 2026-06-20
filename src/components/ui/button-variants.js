import { tv } from 'tailwind-variants'

export const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[0.02em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08eb1]/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
  variants: {
    variant: {
      romantic:
        'bg-[#7c264d] px-6 py-3 text-sm text-white shadow-[0_18px_50px_rgba(124,38,77,0.28)] hover:-translate-y-0.5 hover:bg-[#69203f]',
      outline:
        'border border-white/55 bg-white/55 px-6 py-3 text-sm text-[#7a3150] shadow-[0_14px_40px_rgba(191,121,146,0.14)] backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white/75',
      ghost:
        'h-11 w-11 rounded-full border border-white/45 bg-white/50 p-0 text-[#8f4765] shadow-[0_12px_32px_rgba(157,79,109,0.12)] backdrop-blur-sm hover:-translate-y-1 hover:bg-white/80',
    },
    size: {
      default: '',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'romantic',
    size: 'default',
  },
})
