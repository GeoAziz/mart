'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export function useScrollReveal() {
  const [elements, setElements] = useState<HTMLElement[]>([]);

  // Use a ref to store the observer so it persists across re-renders
  const observer = useRef<IntersectionObserver | null>(null);

  const addToRefs = useCallback((el: HTMLElement | null) => {
    if (el) {
      // Use a function with setElements to get the previous state
      // and prevent adding duplicate elements, which could happen with React 18 strict mode.
      setElements(prev => {
        if (prev.includes(el)) {
          return prev;
        }
        return [...prev, el];
      });
    }
  }, []);

  useEffect(() => {
    // Disconnect the old observer before creating a new one
    if (observer.current) {
      observer.current.disconnect();
    }

    // Create a new observer with the latest elements
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Once visible, we can stop observing it for performance.
            observer.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );

    const currentObserver = observer.current;
    elements.forEach((el) => {
      if (el) {
        currentObserver.observe(el);
      }
    });

    // Cleanup function to disconnect the observer when the component unmounts
    return () => {
      currentObserver.disconnect();
    };
  }, [elements]); // This effect re-runs whenever the list of elements changes

  return addToRefs;
}
