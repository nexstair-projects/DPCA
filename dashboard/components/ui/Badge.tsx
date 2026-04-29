// components/ui/badge.tsx
const badgeVariants = {
  brandVoice: 'bg-blue-50 text-blue-900 border-blue-200',
  template: 'bg-green-50 text-green-900 border-green-200',
  emailExample: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  faq: 'bg-purple-50 text-purple-900 border-purple-200',
  vendor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  process: 'bg-amber-50 text-amber-900 border-amber-200',
  qualification: 'bg-red-50 text-red-900 border-red-200',
  newInquiry: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  existingClient: 'bg-blue-50 text-blue-900 border-blue-200',
  collaboration: 'bg-purple-50 text-purple-900 border-purple-200',
  general: 'bg-gray-50 text-gray-900 border-gray-200',
  highValue: 'bg-red-50 text-red-800 border-red-200',
  default: 'bg-gray-50 text-gray-600 border-gray-200',
} as const

type BadgeVariant = keyof typeof badgeVariants

interface BadgeProps {
  variant?: BadgeVariant | string
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variantClasses = badgeVariants[variant as BadgeVariant] || badgeVariants.default

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-medium border ${variantClasses} ${className}`}
    >
      {children}
    </span>
  )
}