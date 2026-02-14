document.addEventListener('DOMContentLoaded', () => {
  const headerScheduleInfo = document.getElementById('headerScheduleInfo');
  const root = document.querySelector('.dash');
  const sidebar = document.querySelector('.sidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const collapseBtn = document.getElementById('collapseBtn');
  const profileMenu = document.getElementById('profileMenu');
  const profileTrigger = document.getElementById('profileTrigger');
  const notificationsMenu = document.getElementById('notificationsMenu');
  const notificationsTrigger = document.getElementById('notificationsTrigger');
  const notificationsList = document.getElementById('notificationsList');
  const notificationDot = document.getElementById('notificationDot');
  const languageMenu = document.getElementById('languageMenu');
  const languageTrigger = document.getElementById('languageTrigger');
  const languagePanel = document.getElementById('languagePanel');
  const toggleUsernameCard = document.getElementById('toggleUsernameCard');
  const usernameChangeCard = document.getElementById('usernameChangeCard');
  const togglePasswordCard = document.getElementById('togglePasswordCard');
  const passwordChangeCard = document.getElementById('passwordChangeCard');
  const dismiss = document.getElementById('dismissAnnouncement');
  const openAllEventsBtn = document.getElementById('openAllEventsBtn');
  const closeAllEventsBtn = document.getElementById('closeAllEventsBtn');
  const allEventsCard = document.getElementById('allEventsCard');
  const allEventsBackdrop = document.getElementById('allEventsBackdrop');
  const openAllSchedulesBtn = document.getElementById('openAllSchedulesBtn');
  const closeAllSchedulesBtn = document.getElementById('closeAllSchedulesBtn');
  const allSchedulesCard = document.getElementById('allSchedulesCard');
  const allSchedulesBackdrop = document.getElementById('allSchedulesBackdrop');

  const prevDay = document.getElementById('prevDay');
  const nextDay = document.getElementById('nextDay');
  const todayBtn = document.getElementById('todayBtn');
  const i18nJsonEl = document.getElementById('dashboardI18n');
  const dashboardI18n = i18nJsonEl ? JSON.parse(i18nJsonEl.textContent) : {};
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

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

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const formatNotificationTime = (timestamp) => {
    const parsed = Number(timestamp);
    if (!Number.isFinite(parsed)) return '';

    const date = new Date(parsed);
    if (Number.isNaN(date.getTime())) return '';

    return `${formatDateLocal(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderNotifications = (notifications = []) => {
    if (!notificationsList) return;

    if (!notifications.length) {
      notificationsList.innerHTML = `<p class="notifications-empty">${escapeHtml(dashboardI18n.noNotifications || 'No notifications.')}</p>`;
      return;
    }

    notificationsList.innerHTML = notifications.map((notification) => `
      <article class="notification-item ${notification.is_read ? 'is-read' : ''}">
        <div class="notification-item-head">
          <strong>${escapeHtml(notification.title)}</strong>
          <span class="notification-time">${escapeHtml(formatNotificationTime(notification.created_at))}</span>
        </div>
        <p class="notification-message">${escapeHtml(notification.message)}</p>
        <div class="notification-actions">
          ${notification.is_read ? '' : `<button type="button" class="notification-action" data-action="read" data-id="${notification.id}">${escapeHtml(dashboardI18n.markRead || 'Mark as Read')}</button>`}
          <button type="button" class="notification-action delete" data-action="delete" data-id="${notification.id}">${escapeHtml(dashboardI18n.deleteLabel || 'Delete')}</button>
        </div>
      </article>
    `).join('');
  };

  const loadNotifications = async () => {
    if (!notificationsList) return;

    try {
      const response = await fetch('/notifications', {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error('notifications_fetch_failed');
      }

      const payload = await response.json();
      renderNotifications(payload.notifications || []);

      if (notificationDot) {
        notificationDot.hidden = !payload.unreadCount;
      }
    } catch (_err) {
      notificationsList.innerHTML = `<p class="notifications-empty">${escapeHtml(dashboardI18n.loadFailed || 'Failed to load notifications.')}</p>`;
    }
  };

  const updateHeaderScheduleInfo = () => {
    if (!headerScheduleInfo) return;
    const now = new Date();
    headerScheduleInfo.textContent = `${formatDateLocal(now)} • Week ${getWeekCycle(now)} • ${getCurrentLectureLabel(now)}`;
  };

  updateHeaderScheduleInfo();
  setInterval(updateHeaderScheduleInfo, 30 * 1000);

  const nav = sidebar?.querySelector('.nav');
  const fitSidebarMenuScale = () => {
    if (!sidebar || !root || !nav) return;

    if (root.classList.contains('collapsed') || window.matchMedia('(max-width: 860px)').matches) {
      sidebar.style.setProperty('--menu-scale', '1');
      return;
    }

    sidebar.style.setProperty('--menu-scale', '1');

    const navItems = nav.querySelectorAll('.nav-item');
    if (!navItems.length) return;

    let maxItemWidth = 0;
    navItems.forEach((item) => {
      maxItemWidth = Math.max(maxItemWidth, item.scrollWidth);
    });

    const availableWidth = nav.clientWidth;
    if (!availableWidth || !maxItemWidth) return;

    const scale = Math.max(0.72, Math.min(1.08, availableWidth / maxItemWidth));
    sidebar.style.setProperty('--menu-scale', scale.toFixed(3));
  };

  fitSidebarMenuScale();
  window.addEventListener('resize', fitSidebarMenuScale);

  // Sidebar collapse
  collapseBtn?.addEventListener('click', () => {
    root?.classList.toggle('collapsed');
    window.setTimeout(fitSidebarMenuScale, 180);
  });

  const closeMobileMenu = () => {
    if (!sidebar || !mobileMenuBtn) return;
    sidebar.classList.remove('mobile-open');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
  };

  mobileMenuBtn?.addEventListener('click', () => {
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('mobile-open');
    mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    window.setTimeout(fitSidebarMenuScale, 120);
  });

  // Profile dropdown
  profileTrigger?.addEventListener('click', () => {
    const isOpen = profileMenu?.classList.toggle('open');
    profileTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      notificationsMenu?.classList.remove('open');
      notificationsTrigger?.setAttribute('aria-expanded', 'false');
    }
  });

  notificationsTrigger?.addEventListener('click', async () => {
    const isOpen = notificationsMenu?.classList.toggle('open');
    notificationsTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      profileMenu?.classList.remove('open');
      profileTrigger?.setAttribute('aria-expanded', 'false');
      languageMenu?.classList.remove('open');
      languageTrigger?.setAttribute('aria-expanded', 'false');
      await loadNotifications();
    }
  });

  languageTrigger?.addEventListener('click', () => {
    const isOpen = languageMenu?.classList.toggle('open');
    languageTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      profileMenu?.classList.remove('open');
      profileTrigger?.setAttribute('aria-expanded', 'false');
      notificationsMenu?.classList.remove('open');
      notificationsTrigger?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (sidebar && mobileMenuBtn && window.matchMedia('(max-width: 860px)').matches) {
      const clickedInsideSidebar = sidebar.contains(e.target);
      if (!clickedInsideSidebar) {
        closeMobileMenu();
      }
    }

    if (profileMenu && profileTrigger && !profileMenu.contains(e.target)) {
      profileMenu.classList.remove('open');
      profileTrigger.setAttribute('aria-expanded', 'false');
    }

    if (notificationsMenu && notificationsTrigger && !notificationsMenu.contains(e.target)) {
      notificationsMenu.classList.remove('open');
      notificationsTrigger.setAttribute('aria-expanded', 'false');
    }

    if (languageMenu && languageTrigger && !languageMenu.contains(e.target)) {
      languageMenu.classList.remove('open');
      languageTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  languagePanel?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-lang]');
    if (!button) return;

    const language = button.getAttribute('data-lang');
    if (!language) return;

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

  notificationsList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action][data-id]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const notificationId = button.getAttribute('data-id');
    if (!action || !notificationId) return;

    try {
      const response = await fetch(
        action === 'read' ? `/notifications/${notificationId}/read` : `/notifications/${notificationId}`,
        {
          method: action === 'read' ? 'PATCH' : 'DELETE',
          headers: {
            Accept: 'application/json',
            'x-csrf-token': csrfToken
          }
        }
      );

      if (!response.ok) {
        throw new Error('notification_action_failed');
      }

      await loadNotifications();
    } catch (_err) {
      await loadNotifications();
    }
  });

  loadNotifications();
  setInterval(loadNotifications, 60 * 1000);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) {
      closeMobileMenu();
    }
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

  openAllEventsBtn?.addEventListener('click', () => {
    if (!allEventsCard) return;
    allEventsCard.removeAttribute('hidden');
    allEventsBackdrop?.removeAttribute('hidden');
    root?.classList.add('all-events-open');
  });

  closeAllEventsBtn?.addEventListener('click', () => {
    if (!allEventsCard) return;
    allEventsCard.setAttribute('hidden', 'hidden');
    allEventsBackdrop?.setAttribute('hidden', 'hidden');
    root?.classList.remove('all-events-open');
  });

  openAllSchedulesBtn?.addEventListener('click', () => {
    if (!allSchedulesCard) return;
    allSchedulesCard.removeAttribute('hidden');
    allSchedulesBackdrop?.removeAttribute('hidden');
    root?.classList.add('all-schedules-open');
  });

  closeAllSchedulesBtn?.addEventListener('click', () => {
    if (!allSchedulesCard) return;
    allSchedulesCard.setAttribute('hidden', 'hidden');
    allSchedulesBackdrop?.setAttribute('hidden', 'hidden');
    root?.classList.remove('all-schedules-open');
  });

  document.querySelectorAll('[data-filter-toggle]').forEach((toggleButton) => {
    const panelId = toggleButton.getAttribute('data-filter-toggle');
    if (!panelId) return;

    const panel = document.getElementById(panelId);
    if (!panel || !panel.hasAttribute('data-filter-panel')) return;

    toggleButton.addEventListener('click', () => {
      const willOpen = panel.classList.contains('is-collapsed');
      panel.classList.toggle('is-collapsed', !willOpen);
      toggleButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
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
  const nav = document.getElementById('primaryNav');
  if (!nav) return;

  const menuGroups = Array.from(nav.querySelectorAll('.nav-group.has-submenu'));
  if (!menuGroups.length) return;

  nav.addEventListener('click', (e) => {
    const trigger = e.target.closest('.nav-trigger');
    if (!trigger || !nav.contains(trigger)) return;

    e.preventDefault();
    const currentGroup = trigger.closest('.nav-group.has-submenu');
    if (!currentGroup) return;

    const willOpen = !currentGroup.classList.contains('open');
    menuGroups.forEach((group) => {
      if (group !== currentGroup) {
        group.classList.remove('open');
      }
    });

    currentGroup.classList.toggle('open', willOpen);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const subTriggers = document.querySelectorAll('.nav-subtrigger');
  if (!subTriggers.length) return;

  subTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const group = trigger.closest('.nav-subgroup');
      if (!group) return;
      group.classList.toggle('open');
    });
  });
});
