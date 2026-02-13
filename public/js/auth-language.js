document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('authLanguageMenu');
  const trigger = document.getElementById('authLanguageTrigger');
  const panel = document.getElementById('authLanguagePanel');
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  if (!menu || !trigger || !panel) {
    return;
  }

  trigger.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (event) => {
    if (menu.contains(event.target)) {
      return;
    }

    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  });

  panel.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-lang]');
    if (!button) {
      return;
    }

    const language = button.getAttribute('data-lang');
    if (!language) {
      return;
    }

    try {
      const response = await fetch('/auth/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        throw new Error('language_update_failed');
      }

      window.location.reload();
    } catch (_err) {
      // keep current language if update fails
    }
  });
});
