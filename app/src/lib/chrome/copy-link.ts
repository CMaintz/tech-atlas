export function initCopyLinks() {
  document.addEventListener('click', async (e) => {
    const b = (e.target as Element | null)?.closest<HTMLElement>('[data-copy-link]');
    if (!b) return;
    const label = b.querySelector('[data-label]') ?? b;
    const before = label.textContent;
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0]);
      label.textContent = b.dataset.copied ?? before;
      setTimeout(() => (label.textContent = before), 2000);
    } catch {
      return;
    }
  });
}
