import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function useFocusTrap(modalRef) {
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!modalRef?.current) return
    previousFocus.current = document.activeElement

    // Focus first focusable element
    const els = modalRef.current.querySelectorAll(FOCUSABLE)
    if (els.length) els[0].focus()

    const handleKey = (e) => {
      if (e.key !== 'Tab') return
      const focusable = [...modalRef.current.querySelectorAll(FOCUSABLE)]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (previousFocus.current?.focus) previousFocus.current.focus()
    }
  }, [modalRef?.current])
}
