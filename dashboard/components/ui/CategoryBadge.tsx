// components/category-badge.tsx
import { Badge } from '@/components/ui/Badge'

const categoryLabels = {
  brand_voice: { label: 'Brand Voice', variant: 'brandVoice' },
  template: { label: 'Template', variant: 'template' },
  email_example: { label: 'Email Example', variant: 'emailExample' },
  faq: { label: 'FAQ', variant: 'faq' },
  vendor: { label: 'Vendor', variant: 'vendor' },
  process: { label: 'Process', variant: 'process' },
  qualification: { label: 'Qualification', variant: 'qualification' },
  new_inquiry: { label: 'New Inquiry', variant: 'newInquiry' },
  existing_client: { label: 'Client', variant: 'existingClient' },
  collaboration: { label: 'Collab', variant: 'collaboration' },
  general: { label: 'General', variant: 'general' },
} as const

type Category = keyof typeof categoryLabels

interface CategoryBadgeProps {
  category: Category | string | null
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
    console.log('Rendering CategoryBadge with category:', categoryLabels[category as Category]?.label || category || 'general');
  const config = category && category in categoryLabels
    ? categoryLabels[category as Category]
    : { label: category || 'General', variant: 'default' }

    console.log("CategoryBadge config:", config);

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}