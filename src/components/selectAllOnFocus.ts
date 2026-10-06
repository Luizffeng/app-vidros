const SELECTOR = 'input[inputmode="decimal"], input[data-select-all]'

export function installSelectAllOnFocus(doc: Document = document) {
  let pending: HTMLInputElement | null = null

  const selectAll = (el: HTMLInputElement) => {
    if (doc.activeElement === el) el.setSelectionRange(0, el.value.length)
  }

  doc.addEventListener('focusin', (event) => {
    const el = event.target
    if (!(el instanceof HTMLInputElement) || !el.matches(SELECTOR)) return
    pending = el
    selectAll(el)
    setTimeout(() => selectAll(el), 0)
  })

  doc.addEventListener('focusout', (event) => {
    if (event.target === pending) pending = null
  })

  // WebKit/Blink collapse the selection on the mouseup that follows the focusing click.
  doc.addEventListener('mouseup', (event) => {
    if (!pending || event.target !== pending) return
    event.preventDefault()
    selectAll(pending)
    pending = null
  })
}
