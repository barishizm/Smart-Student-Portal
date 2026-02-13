document.addEventListener('DOMContentLoaded', () => {
  const headerScheduleInfo = document.getElementById('headerScheduleInfo');
  const root = document.querySelector('.dash');
  const collapseBtn = document.getElementById('collapseBtn');
  const profileMenu = document.getElementById('profileMenu');
  const profileTrigger = document.getElementById('profileTrigger');
  const toggleUsernameCard = document.getElementById('toggleUsernameCard');
  const usernameChangeCard = document.getElementById('usernameChangeCard');
  const togglePasswordCard = document.getElementById('togglePasswordCard');
  const passwordChangeCard = document.getElementById('passwordChangeCard');
  const dismiss = document.getElementById('dismissAnnouncement');

  const prevDay = document.getElementById('prevDay');
  const nextDay = document.getElementById('nextDay');
  const todayBtn = document.getElementById('todayBtn');

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekCycle = (date) => {
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.min(4, Math.floor((dayOfMonth - 1) / 7) + 1);
    return weekOfMonth % 2 === 1 ? 1 : 2;
  };

  const getCurrentLectureLabel = (date) => {
    const nowMinutes = (date.getHours() * 60) + date.getMinutes();
    const slots = [
      { start: 8 * 60 + 30, end: 10 * 60 + 5, label: '1st lecture' },
      { start: 10 * 60 + 20, end: 11 * 60 + 55, label: '2nd lecture' },
      { start: 12 * 60 + 10, end: 13 * 60 + 45, label: '3rd lecture' },
      { start: 13 * 60 + 45, end: 14 * 60 + 30, label: 'Lunch Break' },
      { start: 14 * 60 + 30, end: 16 * 60 + 5, label: '4th lecture' },
      { start: 16 * 60 + 20, end: 17 * 60 + 55, label: '5th lecture' },
      { start: 18 * 60 + 10, end: 19 * 60 + 45, label: '6th lecture' },
      { start: 19 * 60 + 55, end: 21 * 60 + 30, label: '7th lecture' }
    ];

    const activeSlot = slots.find((slot) => nowMinutes >= slot.start && nowMinutes < slot.end);
    return activeSlot ? activeSlot.label : 'Break';
  };

  const updateHeaderScheduleInfo = () => {
    if (!headerScheduleInfo) return;
    const now = new Date();
    headerScheduleInfo.textContent = `${formatDateLocal(now)} • Week ${getWeekCycle(now)} • ${getCurrentLectureLabel(now)}`;
  };

  updateHeaderScheduleInfo();
  setInterval(updateHeaderScheduleInfo, 30 * 1000);

  // Sidebar collapse
  collapseBtn?.addEventListener('click', () => {
    root?.classList.toggle('collapsed');
  });

  // Profile dropdown
  profileTrigger?.addEventListener('click', () => {
    const isOpen = profileMenu?.classList.toggle('open');
    profileTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!profileMenu || !profileTrigger) return;
    if (profileMenu.contains(e.target)) return;
    profileMenu.classList.remove('open');
    profileTrigger.setAttribute('aria-expanded', 'false');
  });

  toggleUsernameCard?.addEventListener('click', () => {
    if (!usernameChangeCard) return;

    const isHidden = usernameChangeCard.hasAttribute('hidden');
    if (isHidden) {
      usernameChangeCard.removeAttribute('hidden');
      toggleUsernameCard.setAttribute('aria-expanded', 'true');
      passwordChangeCard?.setAttribute('hidden', 'hidden');
      togglePasswordCard?.setAttribute('aria-expanded', 'false');
    } else {
      usernameChangeCard.setAttribute('hidden', 'hidden');
      toggleUsernameCard.setAttribute('aria-expanded', 'false');
    }
  });

  togglePasswordCard?.addEventListener('click', () => {
    if (!passwordChangeCard) return;

    const isHidden = passwordChangeCard.hasAttribute('hidden');
    if (isHidden) {
      passwordChangeCard.removeAttribute('hidden');
      togglePasswordCard.setAttribute('aria-expanded', 'true');
      usernameChangeCard?.setAttribute('hidden', 'hidden');
      toggleUsernameCard?.setAttribute('aria-expanded', 'false');
    } else {
      passwordChangeCard.setAttribute('hidden', 'hidden');
      togglePasswordCard.setAttribute('aria-expanded', 'false');
    }
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

document.addEventListener('DOMContentLoaded', () => {
  const studiesItem = document.getElementById('studiesItem');
  const trigger = document.getElementById('studiesTrigger');

  if (!studiesItem || !trigger) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    studiesItem.classList.toggle('open');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const item = document.getElementById('procedureItem');
  const trigger = document.getElementById('procedureTrigger');
  if (!item || !trigger) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    item.classList.toggle('open');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const item = document.getElementById('careerItem');
  const trigger = document.getElementById('careerTrigger');
  if (!item || !trigger) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    item.classList.toggle('open');
  });
});
