import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { BOTTOM_AXIS, SSR_BUDGET, SSR_WIDTH, TOP_AXIS } from '../../lib/timeline-layout';
import { listen } from '../../lib/listen';

/**
 * The horizontal chart's room: its width (`avail`) and the height left for lanes below
 * its top edge (`budget`), re-measured on resize. Typical desktop values until the
 * island measures; left alone while the chart is hidden (phone layout).
 */
export function useChartSize() {
  const ref = useRef<HTMLElement>(null);
  const [avail, setAvail] = useState(SSR_WIDTH);
  const [budget, setBudget] = useState(SSR_BUDGET);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!el.clientWidth) return; // hidden (phone layout)
      setAvail(el.clientWidth);
      setBudget(laneBudget(el));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const offResize = listen(window, 'resize', measure);
    return () => {
      ro.disconnect();
      offResize();
    };
  }, []);
  return { ref, avail, budget };
}

/** The viewport height below the chart's top, less its axes (at least 240px). */
function laneBudget(el: HTMLElement) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  return Math.max(240, window.innerHeight - top - TOP_AXIS - BOTTOM_AXIS - 12);
}
