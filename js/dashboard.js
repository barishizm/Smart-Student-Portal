document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.dash');
  const collapseBtn = document.getElementById('collapseBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const dismiss = document.getElementById('dismissAnnouncement');

  const prevDay = document.getElementById('prevDay');
  const nextDay = document.getElementById('nextDay');
  const todayBtn = document.getElementById('todayBtn');

  // Sidebar collapse
  collapseBtn?.addEventListener('click', () => {
    root?.classList.toggle('collapsed');
  });

  // Fake logout -> back to login page
  logoutBtn?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  // Dismiss announcement (UI only)
  dismiss?.addEventListener('click', () => {
    const hero = dismiss.closest('.card');
    if (!hero) return;
    hero.style.opacity = '0';
    hero.style.transform = 'translateY(-6px)';
    hero.style.transition = 'all .25s ease';
    setTimeout(() => hero.remove(), 250);
  });

  // Mini schedule controls (UI only)
  const setToast = (msg) => {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.bottom = '18px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '14px';
    el.style.background = 'rgba(255,255,255,.10)';
    el.style.border = '1px solid rgba(255,255,255,.16)';
    el.style.backdropFilter = 'blur(14px)';
    el.style.color = 'rgba(255,255,255,.92)';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  };

  prevDay?.addEventListener('click', () => setToast('Previous day (demo)'));
  nextDay?.addEventListener('click', () => setToast('Next day (demo)'));
  todayBtn?.addEventListener('click', () => setToast('Today (demo)'));
});