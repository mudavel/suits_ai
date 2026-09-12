export default function Brand({ compact = false }) {
  return (
    <span className={'brand ' + (compact ? 'brand--compact' : '')} aria-label="Suits AI">
      <span>SUITS<span className="brand-ai"> AI</span></span>
      <span className="brand-mark" aria-hidden="true" />
    </span>
  )
}
