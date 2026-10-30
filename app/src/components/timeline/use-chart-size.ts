import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { BOTTOM_AXIS, SSR_BUDGET, SSR_WIDTH, TOP_AXIS } from '../../lib/timeline-layout';
import { listen } from '../../lib/listen';

export function useChartSize() {
  const ref = useRef<HTMLElement>(null);
  const [avail, setAvail] = useState(SSR_WIDTH);
  const [budget, setBudget] = useState(SSR_BUDGET);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measureUnlessHidden = () => {
      if (!el.clientWidth) return;
      setAvail(el.clientWidth);
      setBudget(laneBudget(el));
    };
    measureUnlessHidden();
    return remeasureOnResize(el, measureUnlessHidden);
  }, []);
  return { ref, avail, budget };
}

function remeasureOnResize(el: HTMLElement, measure: () => void) {
  const ro = new ResizeObserver(measure);
  ro.observe(el);
  const offResize = listen([window, 'resize', measure]);
  return () => {
    ro.disconnect();
    offResize();
  };
}

function laneBudget(el: HTMLElement) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  return Math.max(240, window.innerHeight - top - TOP_AXIS - BOTTOM_AXIS - 12);
}
