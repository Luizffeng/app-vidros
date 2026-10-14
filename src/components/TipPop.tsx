import { useRef, useState, type ReactNode } from 'react'
import { markTipSeen, TIPS, tipSeen, type TipId } from '../data/tips'
import { ConfirmPop } from './ConfirmPop'
import { useDismiss } from './useDismiss'

/**
 * Wraps a header button and shows its tip once, below it. "Entendi", a tap anywhere
 * (the button included), Esc or the device back all count as seen.
 */
export function TipPop({ tip, when, children }: { tip: TipId; when: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(() => tipSeen(tip))
  const open = when && !seen
  const see = () => {
    markTipSeen(tip)
    setSeen(true)
  }
  useDismiss(open, ref, see)
  return (
    <div className="tip-pop" ref={ref} onClickCapture={() => open && see()}>
      {children}
      <ConfirmPop
        open={open}
        place="below"
        block
        tone="primary"
        label={TIPS[tip].title}
        message={TIPS[tip].pop}
        yesLabel="Entendi"
        onYes={see}
      />
    </div>
  )
}
