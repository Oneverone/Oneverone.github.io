import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}) {
  const Comp = asChild ? 'span' : 'button'

  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Comp>
  )
}

export { Button }
