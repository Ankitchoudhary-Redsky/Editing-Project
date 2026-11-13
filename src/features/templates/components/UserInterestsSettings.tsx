import { Settings2 } from 'lucide-react'

export function UserInterestsSettings({ onClick }: { onClick: () => void }) {
  return <button type="button" className="template-settings-button" title="Edit template interests" aria-label="Edit template interests" onClick={onClick}><Settings2 size={17} /></button>
}