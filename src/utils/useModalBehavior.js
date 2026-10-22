// src/utils/useModalBehavior.js
// Accessibility helper for modal dialogs.
//
// Applies the three pieces of behavior every modal needs:
//   1. Close on Escape — keyboard users expect Esc to dismiss a dialog.
//   2. Backdrop click-to-close — clicking outside the panel dismisses
//      the dialog without forcing the user to find the X button.
//   3. Nothing else — focus-trap and focus-restore are deliberately
//      NOT in this hook (they require a small refactor of every modal
//      and are tracked separately in the accessibility audit).
//
// Usage:
//   const { onKeyDown, onBackdropClick } = useModalBehavior(isOpen, onClose);
//   <div className="fixed inset-0 ..." role="dialog" aria-modal="true"
//        aria-labelledby="my-title" onKeyDown={onKeyDown}
//        onClick={onBackdropClick}>
//     <h2 id="my-title">Title</h2>
//     <div className="bg-white ..." onClick={(e) => e.stopPropagation()}>
//       …panel content…
//     </div>
//   </div>
//
// The panel's `onClick` stopPropagation is important — it prevents a
// click inside the panel from bubbling up to the backdrop and closing
// the modal.

import { useEffect, useCallback } from 'react';

export function useModalBehavior(isOpen, onClose) {
  // Close on Escape. Effect is gated on `isOpen` so an unmounted modal
  // does not hold a stale keydown listener.
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Backdrop-click handler. Attach to the outermost wrapper of the
  // modal. Only closes if the click target is the backdrop itself
  // (i.e. `e.currentTarget`), not a child element bubbling up.
  const onBackdropClick = useCallback((e) => {
    if (!onClose) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Keydown handler that can also be attached directly to the modal
  // wrapper for parity with how some modals wire up events.
  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  return { onKeyDown, onBackdropClick };
}
