// Loading skeleton placeholder — shows shimmer while data loads
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
