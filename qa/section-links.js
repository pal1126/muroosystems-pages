// Bilingual section navigation
{
  const sections = document.currentScript?.dataset.sharedSections;
  if (sections) {
    const shared = new Set(sections.split(' '));
    const language = document.documentElement.lang;
    const opposite = language === 'ja' ? 'en' : 'ja';
    const links = document.querySelectorAll('a[hreflang="' + opposite + '"]');
    function syncSection() {
      let id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* Invalid fragment. */ }
      for (const link of links) {
        const url = new URL(link.href);
        if (url.origin !== location.origin) continue;
        url.hash = shared.has(id) ? id : '';
        link.href = url.href;
      }
    }
    syncSection();
    window.addEventListener('hashchange', syncSection);
    window.addEventListener('pageshow', syncSection);
  }
}
