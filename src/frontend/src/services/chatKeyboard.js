export function submitChatOnEnter(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return
  event.preventDefault()
  // Use the form's existing validation and submission guards for both keyboard and button.
  if (!event.repeat) event.currentTarget.form?.requestSubmit()
}
