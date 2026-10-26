import { useEffect, useRef } from 'react';

/**
 * Custom hook to trap focus inside a modal dialog and manage accessibility
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Optional close callback on Escape key
 * @returns {React.RefObject} - Ref to attach to the dialog/modal container element
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore upon close
    previousActiveElement.current = document.activeElement;

    // Prevent body scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first interactive element or the container
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const focusableSelectors = [
        'input:not([disabled]):not([type="hidden"])',
        'button:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');

      const focusableElements = Array.from(container.querySelectorAll(focusableSelectors));
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        container.focus();
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
      return;
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusableSelectors = [
          'input:not([disabled]):not([type="hidden"])',
          'button:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',');

        const focusableElements = Array.from(container.querySelectorAll(focusableSelectors));
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab -> reverse
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab -> forward
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return containerRef;
}

export default useFocusTrap;
