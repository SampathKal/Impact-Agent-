import { useEffect, useRef, useState } from "react";

/** Lightweight local fallback; does not require a React Bits Pro license. */
export default function ThreeDReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`three-d-reveal ${visible ? "is-visible" : ""}`} aria-label="Turn what you care about into something you can do">
      <span>Turn what you care about</span>
      <span>into something you can do.</span>
    </div>
  );
}
