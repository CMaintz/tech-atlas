/** The "Back to top" pill appears once the reader has scrolled a screen or so. */
export function initBackToTop() {
  const top = document.querySelector<HTMLElement>('[data-back-to-top]');
  if (!top) return;
  const update = () => (top.hidden = window.scrollY < window.innerHeight * 1.2);
  window.addEventListener('scroll', update, { passive: true });
  update();
}
