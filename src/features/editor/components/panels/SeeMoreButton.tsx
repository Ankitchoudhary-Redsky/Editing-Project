type SeeMoreButtonProps = {
  expanded: boolean
  onClick: () => void
}

export function SeeMoreButton({ expanded, onClick }: SeeMoreButtonProps) {
  return (
    <button
        type="button"
        className="secoondary-button full-button"
        aria-expanded={expanded}
        onClick={onClick}
    >
      {expanded ? 'See less' : 'See more'}
    </button>
  )
}