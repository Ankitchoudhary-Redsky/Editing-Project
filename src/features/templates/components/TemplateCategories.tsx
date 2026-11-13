import {
  Bookmark, BriefcaseBusiness, Cpu, GraduationCap, Heart,
  LayoutTemplate, PartyPopper, Palette, Share2, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const sections: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'All Templates', icon: LayoutTemplate },
  { id: 'recommended', label: 'Recommended for You', icon: Sparkles },
  { id: 'festivals-occasions', label: 'Festivals & Occasions', icon: PartyPopper },
  { id: 'engineering', label: 'Engineering', icon: Cpu },
  { id: 'education-students', label: 'Education & Students', icon: GraduationCap },
  { id: 'business-professional', label: 'Business', icon: BriefcaseBusiness },
  { id: 'creative-professionals', label: 'Creative', icon: Palette },
  { id: 'social-media', label: 'Social Media', icon: Share2 },
  { id: 'personal', label: 'Personal', icon: Heart },
  { id: 'my-templates', label: 'My Templates', icon: Bookmark },
]

export function TemplateCategories({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <nav className="template-category-nav" aria-label="Template sections">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`template-category-link${active === id ? ' active' : ''}`}
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={17} strokeWidth={1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}