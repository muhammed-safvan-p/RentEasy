import { useEffect, useRef } from "react";

interface UseModalA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Custom hook for modal accessibility (A11y):
 * - Closes modal on 'Escape' key press
 * - Traps focus (Tab / Shift+Tab) within modal focusable elements
 * - Locks background body scrolling while open
 * - Restores focus to the trigger element upon closing
 */
export function useModalA11y({ isOpen, onClose, initialFocusRef }: UseModalA11yOptions) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const initialFocusRefRef = useRef(initialFocusRef);
  initialFocusRefRef.current = initialFocusRef;

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on unmount
    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    // Focus the initial element or the first focusable element ONLY when opening
    const timer = setTimeout(() => {
      // Do not steal focus if an input/element inside the modal is already focused
      if (
        modalRef.current &&
        document.activeElement &&
        modalRef.current.contains(document.activeElement) &&
        document.activeElement !== document.body
      ) {
        return;
      }

      if (initialFocusRefRef.current?.current) {
        initialFocusRefRef.current.current.focus();
      } else if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 50);

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Handle Escape key and Tab focus trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null); // Filter out hidden elements

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen]);

  return modalRef;
}
