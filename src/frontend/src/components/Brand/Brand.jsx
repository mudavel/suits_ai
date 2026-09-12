export default function Brand({ compact = false }) {
  return (
    <span className={'brand ' + (compact ? 'brand--compact' : '')} aria-label="Enter OS">
      <span>Enter<span className="brand-ai"> OS</span></span>
      <span className="brand-mark" aria-hidden="true" />
    </span>
  )
}
