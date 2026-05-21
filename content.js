// content.js — Flex Prime v4.1 — Complete UI Overhaul

(function () {
  const isAuthPage =
    window.location.pathname.toLowerCase() === '/login' ||
    window.location.pathname.toLowerCase() === '/account/login';

  chrome.storage.local.get(['jf_theme', 'dark_mode_global'], (res) => {
    if (!isAuthPage) {
      injectFonts();
      const theme = res.jf_theme || (res.dark_mode_global ? 'dark' : 'dark');
      applyFlexTheme(theme);
      injectScrollTopBtn();
      injectSidebarBadges();
      // Run attendance enhancements after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAttendanceEnhancements);
      } else {
        setTimeout(injectAttendanceEnhancements, 800);
      }
    }
  });

  function injectFonts() {
    if (document.getElementById('jf-fonts')) return;
    const link = document.createElement('link');
    link.id = 'jf-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap';
    document.head.appendChild(link);
  }

  // Accepts full theme string ('light', 'dark', 'nord')
  window.applyClaudeTheme = (theme) => {
    applyFlexTheme(theme);
  };

  function applyFlexTheme(theme) {
    // Normalize: accept boolean for backward compat
    if (typeof theme === 'boolean') theme = theme ? 'dark' : 'dark';
    if (!theme) theme = 'dark';

    const id = 'jf-theme';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = id;

    const isDark = theme === 'dark' || theme === 'nord';

    // Nord palette — true Nord Arctic (blue-grey slate, polar accent)
    const nordPalette = {
      pageBg:      '#2e3440',
      sidebarBg:   '#242933',
      surfaceBg:   '#3b4252',
      surfaceAlt:  '#434c5e',
      cardBg:      '#3b4252',
      cardBorder:  '#4c566a',
      headerBg:    'linear-gradient(135deg, #2e3440 0%, #242933 100%)',
      portletHead: 'linear-gradient(90deg, #4c566a 0%, #3b4252 100%)',
      accent:      '#88c0d0',
      accentGlow:  'rgba(136,192,208,0.18)',
      accentAlt:   '#81a1c1',
      success:     '#a3be8c',
      text:        '#eceff4',
      textMuted:   '#d8dee9',
      textDim:     '#81a1c1',
      border:      '#4c566a',
      borderLight: '#5a6478',
      input:       '#2e3440',
      inputBorder: '#4c566a',
      tableHead:   '#2e3440',
      tableRow:    '#3b4252',
      tableRowAlt: '#434c5e',
      shadow:      '0 4px 24px rgba(0,0,0,0.4)',
      navLink:     '#d8dee9',
      navActive:   '#88c0d0',
    };

    const c = theme === 'nord' ? nordPalette : isDark ? {
      // Dark palette — deep navy/slate
      pageBg:      '#0a0e1a',
      sidebarBg:   '#0d1120',
      surfaceBg:   '#111827',
      surfaceAlt:  '#161d2e',
      cardBg:      '#131929',
      cardBorder:  '#1e2d4a',
      headerBg:    'linear-gradient(135deg, #0f2944 0%, #0a1f35 100%)',
      portletHead: 'linear-gradient(90deg, #1a3a5c 0%, #0f2944 100%)',
      accent:      '#3b82f6',
      accentGlow:  'rgba(59,130,246,0.15)',
      accentAlt:   '#06b6d4',
      success:     '#10b981',
      text:        '#e2e8f0',
      textMuted:   '#94a3b8',
      textDim:     '#64748b',
      border:      '#1e2d4a',
      borderLight: '#243352',
      input:       '#0f1929',
      inputBorder: '#243352',
      tableHead:   '#0d1829',
      tableRow:    '#111827',
      tableRowAlt: '#131c2e',
      shadow:      '0 4px 24px rgba(0,0,0,0.4)',
      navLink:     '#94a3b8',
      navActive:   '#3b82f6',
    } : theme === 'light' ? {
      // Light palette — clean premium white/blue
      pageBg:      '#f0f4f8',
      sidebarBg:   '#1e3a5f',
      surfaceBg:   '#ffffff',
      surfaceAlt:  '#f8fafc',
      cardBg:      '#ffffff',
      cardBorder:  '#e2e8f0',
      headerBg:    'linear-gradient(135deg, #1e3a5f 0%, #0f2944 100%)',
      portletHead: 'linear-gradient(90deg, #1e4080 0%, #1a3a6c 100%)',
      accent:      '#2563eb',
      accentGlow:  'rgba(37,99,235,0.1)',
      accentAlt:   '#0891b2',
      success:     '#059669',
      text:        '#0f172a',
      textMuted:   '#475569',
      textDim:     '#94a3b8',
      border:      '#e2e8f0',
      borderLight: '#f1f5f9',
      input:       '#ffffff',
      inputBorder: '#cbd5e1',
      tableHead:   '#f1f5f9',
      tableRow:    '#ffffff',
      tableRowAlt: '#f8fafc',
      shadow:      '0 2px 16px rgba(0,0,0,0.08)',
      navLink:     'rgba(255,255,255,0.75)',
      navActive:   '#ffffff',
    } : {
      // Fallback — same as light
      pageBg:      '#f0f4f8', sidebarBg: '#1e3a5f', surfaceBg: '#ffffff', surfaceAlt: '#f8fafc',
      cardBg: '#ffffff', cardBorder: '#e2e8f0', headerBg: 'linear-gradient(135deg, #1e3a5f 0%, #0f2944 100%)',
      portletHead: 'linear-gradient(90deg, #1e4080 0%, #1a3a6c 100%)', accent: '#2563eb',
      accentGlow: 'rgba(37,99,235,0.1)', accentAlt: '#0891b2', success: '#059669',
      text: '#0f172a', textMuted: '#475569', textDim: '#94a3b8', border: '#e2e8f0',
      borderLight: '#f1f5f9', input: '#ffffff', inputBorder: '#cbd5e1',
      tableHead: '#f1f5f9', tableRow: '#ffffff', tableRowAlt: '#f8fafc',
      shadow: '0 2px 16px rgba(0,0,0,0.08)', navLink: 'rgba(255,255,255,0.75)', navActive: '#ffffff',
    };

    style.textContent = `
      /* ── FONTS ── */
      html, body, * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      .mono, code, pre, [id*="Grandtotal"], td.text-center { font-family: 'JetBrains Mono', monospace !important; }

      /* ── PAGE BASE ── */
      html, body,
      .m-grid.m-grid--hor, .m-wrapper, .m-body, .m-content, .m-page--fluid,
      .m-container, .m-page, .m-grid--root {
        background: ${c.pageBg} !important;
        background-image: none !important;
      }

      /* ── SIDEBAR ── */
      .m-aside-left, .m-aside-menu,
      .m-aside-left .m-aside-menu {
        background: ${c.sidebarBg} !important;
        border-right: 1px solid ${c.border} !important;
      }

      /* Sidebar nav items */
      .m-aside-menu .m-menu__nav > .m-menu__item > .m-menu__link {
        border-radius: 10px !important;
        margin: 2px 10px !important;
        transition: all 0.2s ease !important;
      }
      .m-aside-menu .m-menu__nav > .m-menu__item > .m-menu__link .m-menu__link-title,
      .m-aside-menu .m-menu__nav > .m-menu__item > .m-menu__link .m-menu__link-text,
      .m-aside-menu .m-menu__nav > .m-menu__item > .m-menu__link i,
      .m-aside-menu .m-menu__nav > .m-menu__item > .m-menu__link svg {
        color: rgba(255,255,255,0.65) !important;
        fill: rgba(255,255,255,0.65) !important;
        transition: color 0.2s ease !important;
      }
      .m-aside-menu .m-menu__nav > .m-menu__item:hover > .m-menu__link,
      .m-aside-menu .m-menu__nav > .m-menu__item.m-menu__item--active > .m-menu__link {
        background: rgba(59,130,246,0.15) !important;
      }
      .m-aside-menu .m-menu__nav > .m-menu__item:hover > .m-menu__link .m-menu__link-text,
      .m-aside-menu .m-menu__nav > .m-menu__item.m-menu__item--active > .m-menu__link .m-menu__link-text,
      .m-aside-menu .m-menu__nav > .m-menu__item:hover > .m-menu__link i,
      .m-aside-menu .m-menu__nav > .m-menu__item.m-menu__item--active > .m-menu__link i {
        color: #ffffff !important;
        fill: #ffffff !important;
      }
      .m-aside-menu .m-menu__nav > .m-menu__item.m-menu__item--active > .m-menu__link {
        border-left: 3px solid ${c.accent} !important;
      }

      /* ── TOP HEADER ── */
      .m-header, .m-header--fixed, .m-header .m-container {
        background: ${c.headerBg} !important;
        border-bottom: none !important;
        box-shadow: 0 2px 20px rgba(0,0,0,0.25) !important;
      }

      .m-brand, .m-brand__logo {
        background: transparent !important;
      }

      /* Header icons & text */
      .m-header .m-nav__link-icon,
      .m-header .m-nav__link i,
      .m-header .m-topbar .m-nav .m-nav__item .m-nav__link i,
      .m-header .m-topbar .m-nav .m-nav__item .m-nav__link svg {
        color: rgba(255,255,255,0.85) !important;
        fill: rgba(255,255,255,0.85) !important;
      }

      /* ── PORTLETS / CARDS ── */
      .m-portlet {
        background: ${c.cardBg} !important;
        border: 1px solid ${c.cardBorder} !important;
        border-radius: 16px !important;
        box-shadow: ${c.shadow} !important;
        overflow: visible !important;
        margin-bottom: 24px !important;
        transition: box-shadow 0.2s ease !important;
      }

      .m-portlet:hover {
        box-shadow: 0 8px 32px rgba(59,130,246,0.12) !important;
      }

      .m-portlet .m-portlet__head {
        background: ${c.portletHead} !important;
        border: none !important;
        border-radius: 16px 16px 0 0 !important;
        padding: 16px 24px !important;
        min-height: auto !important;
        overflow: visible !important;
        display: flex !important;
        align-items: center !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
      }

      .m-portlet .m-portlet__head-caption .m-portlet__head-title,
      .m-portlet .m-portlet__head .m-portlet__head-title h3,
      .m-portlet .m-portlet__head .m-portlet__head-title h4,
      .m-portlet__head * {
        color: #ffffff !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        letter-spacing: 0.01em !important;
      }

      .m-portlet__body, .m-portlet .m-portlet__body {
        background: ${c.cardBg} !important;
        padding: 24px !important;
      }

      /* ── TABLES ── */
      .table, .m-table, table {
        background: transparent !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }

      .table thead th, .m-table thead th, table thead th,
      .table > thead > tr > th {
        background: ${c.tableHead} !important;
        color: ${c.textMuted} !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        border-bottom: 2px solid ${c.border} !important;
        border-top: none !important;
        padding: 12px 16px !important;
      }

      .table tbody tr, table tbody tr {
        background: ${c.tableRow} !important;
        transition: background 0.15s ease !important;
      }

      .table tbody tr:nth-child(even), table tbody tr:nth-child(even) {
        background: ${c.tableRowAlt} !important;
      }

      .table tbody tr:hover, table tbody tr:hover {
        background: ${c.accentGlow} !important;
      }

      .table td, .table th, table td, table th,
      .m-datatable td, .m-datatable th {
        background: transparent !important;
        border-color: ${c.border} !important;
        color: ${c.text} !important;
        padding: 12px 16px !important;
        vertical-align: middle !important;
        font-size: 13px !important;
      }

      /* ── INPUTS / FORMS ── */
      input, select, textarea, .form-control {
        background: ${c.input} !important;
        color: ${c.text} !important;
        border: 1.5px solid ${c.inputBorder} !important;
        border-radius: 8px !important;
        padding: 8px 12px !important;
        font-size: 13px !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        outline: none !important;
      }

      input:focus, select:focus, textarea:focus, .form-control:focus {
        border-color: ${c.accent} !important;
        box-shadow: 0 0 0 3px ${c.accentGlow} !important;
      }

      select option {
        background: ${c.input} !important;
        color: ${c.text} !important;
      }

      /* ── TABS ── */
      .nav-tabs, .m-tabs-line {
        border-bottom: 2px solid ${c.border} !important;
        gap: 4px !important;
      }

      .nav-tabs .nav-link, .m-tabs-line .nav-link {
        color: ${c.textMuted} !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        border: none !important;
        border-bottom: 2px solid transparent !important;
        border-radius: 0 !important;
        margin-bottom: -2px !important;
        padding: 10px 16px !important;
        transition: all 0.2s ease !important;
      }

      .nav-tabs .nav-link:hover, .m-tabs-line .nav-link:hover {
        color: ${c.text} !important;
        border-bottom-color: ${c.borderLight} !important;
      }

      .nav-tabs .nav-link.active, .m-tabs-line .nav-link.active {
        color: ${c.accent} !important;
        border-bottom: 2px solid ${c.accent} !important;
        background: transparent !important;
        font-weight: 700 !important;
      }

      /* ── TABS INSIDE PORTLET HEAD (dark bg always) ── */
      .m-portlet__head .nav-tabs,
      .m-portlet__head .m-tabs-line {
        border-bottom-color: rgba(255,255,255,0.2) !important;
      }
      .m-portlet__head .nav-tabs .nav-link,
      .m-portlet__head .m-tabs-line .nav-link {
        color: rgba(255,255,255,0.7) !important;
        border-bottom-color: transparent !important;
      }
      .m-portlet__head .nav-tabs .nav-link:hover,
      .m-portlet__head .m-tabs-line .nav-link:hover {
        color: #ffffff !important;
        border-bottom-color: rgba(255,255,255,0.4) !important;
        background: rgba(255,255,255,0.08) !important;
        border-radius: 6px 6px 0 0 !important;
      }
      .m-portlet__head .nav-tabs .nav-link.active,
      .m-portlet__head .m-tabs-line .nav-link.active {
        color: #ffffff !important;
        border-bottom: 2px solid #ffffff !important;
        background: rgba(255,255,255,0.12) !important;
        border-radius: 6px 6px 0 0 !important;
        font-weight: 700 !important;
      }

      /* ── TAB PANES & CONTENT ── */
      .tab-pane, .tab-content, .m-portlet__body,
      .m-accordion .m-accordion__item,
      .m-accordion .m-accordion__item-body,
      .m-accordion .m-accordion__item-head {
        background: ${c.cardBg} !important;
        color: ${c.text} !important;
      }

      .tab-pane *, .tab-content *, .m-accordion * {
        color: ${c.text} !important;
      }

      /* ── BUTTONS ── */
      .btn-primary, .m-btn--pill.btn-primary {
        background: ${c.accent} !important;
        border-color: ${c.accent} !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 2px 8px ${c.accentGlow} !important;
      }

      .btn-primary:hover {
        filter: brightness(1.1) !important;
        box-shadow: 0 4px 16px ${c.accentGlow} !important;
        transform: translateY(-1px) !important;
      }

      .btn-secondary, button[data-toggle="dropdown"],
      .m-portlet__head-tools .btn {
        background: rgba(255,255,255,0.12) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        backdrop-filter: blur(4px) !important;
      }

      /* ── DROPDOWNS ── */
      .dropdown-menu {
        background: ${c.surfaceBg} !important;
        border: 1px solid ${c.border} !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        padding: 8px !important;
        z-index: 9999 !important;
      }

      .dropdown-item {
        color: ${c.text} !important;
        border-radius: 8px !important;
        padding: 8px 12px !important;
        font-size: 13px !important;
        transition: background 0.15s ease !important;
      }

      .dropdown-item:hover {
        background: ${c.accentGlow} !important;
        color: ${c.accent} !important;
      }

      /* ── GPA SEMESTER CARDS ── */
      .col-md-6:has(table) {
        background: ${c.cardBg} !important;
        border: 1px solid ${c.cardBorder} !important;
        border-radius: 14px !important;
        padding: 16px !important;
        margin-bottom: 20px !important;
        box-shadow: ${c.shadow} !important;
        transition: all 0.2s ease !important;
        overflow: hidden !important;
      }

      .col-md-6:has(table):hover {
        border-color: ${c.accent} !important;
        box-shadow: 0 6px 24px ${c.accentGlow} !important;
      }

      .col-md-6:has(table) span,
      .col-md-6:has(table) strong,
      .col-md-6:has(table) h4,
      .col-md-6:has(table) h5 {
        color: ${c.text} !important;
      }

      /* ── GPA TABLE CELL FIX — prevent overflow ── */
      .col-md-6:has(table) table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      .col-md-6:has(table) table td,
      .col-md-6:has(table) table th {
        font-size: 11px !important;
        padding: 7px 6px !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        max-width: 0 !important;
      }
      /* Course name column gets more space */
      .col-md-6:has(table) table td:nth-child(2),
      .col-md-6:has(table) table th:nth-child(2) {
        width: 35% !important;
      }

      /* ── WIDGETS / TIMELINE ── */
      .m-widget4, .m-widget4 *,
      [class*="m-widget"], [class*="m-widget"] *,
      .card, .card-body, .card-header,
      .panel, .panel-body, .panel-heading {
        background: ${c.cardBg} !important;
        color: ${c.text} !important;
      }

      .m-list-timeline__item { border-bottom: 1px solid ${c.border} !important; }
      .m-list-timeline__item, .m-list-timeline__item * { color: ${c.text} !important; }
      .m-list-timeline__text { background: transparent !important; }

      /* ── BADGES / LABELS ── */
      .m-badge, .badge, .label, [class*="m-badge"], [class*="m-label"] {
        border-radius: 6px !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        padding: 3px 8px !important;
      }

      .m-badge--success, .badge-success, .label-success { background: #dcfce7 !important; color: #166534 !important; }
      .m-badge--danger, .badge-danger, .label-danger { background: #fee2e2 !important; color: #991b1b !important; }
      .m-badge--warning, .badge-warning, .label-warning { background: #fef9c3 !important; color: #854d0e !important; }
      .m-badge--info, .badge-info, .label-info { background: #e0f2fe !important; color: #0c4a6e !important; }

      /* ── COLORED TD CELLS ── */
      td[style*="background"], th[style*="background"],
      td[class*="success"], td[class*="danger"],
      td[class*="warning"], td[class*="info"], td[class*="primary"] {
        opacity: 0.9 !important;
        border-radius: 6px !important;
      }

      /* ── PROGRESS BARS ── */
      .progress { border-radius: 99px !important; height: 6px !important; }
      .progress-bar { border-radius: 99px !important; }

      /* ── ALERTS ── */
      .alert {
        border-radius: 12px !important;
        border: none !important;
        font-weight: 500 !important;
      }

      /* ── GRAND TOTAL ROW (marks fix) ── */
      [id*="Grandtotal"] {
        background: ${c.accentGlow} !important;
        color: ${c.accent} !important;
        font-weight: 700 !important;
        font-size: 13px !important;
      }

      /* ── ATTENDANCE PAGE ── */
      .m-widget1__item .m-widget1__title,
      [class*="m-widget1"] .m-widget1__title {
        font-size: 12px !important; font-weight: 600 !important; line-height: 1.3 !important;
      }
      [class*="m-widget1"] .m-widget1__desc,
      .m-widget1__item .m-widget1__desc {
        font-size: 10px !important; line-height: 1.3 !important;
      }
      [class*="m-widget1"] .m-widget1__number,
      .m-widget1__item .m-widget1__number {
        font-size: 14px !important; font-weight: 700 !important; white-space: nowrap !important;
      }
      .m-widget1__item {
        display: flex !important; flex-wrap: wrap !important;
        align-items: center !important; padding: 10px 0 !important;
      }
      .m-widget1__item .m-widget1__info { flex: 1 !important; min-width: 0 !important; }
      .m-widget1__item .m-widget1__stats { flex-shrink: 0 !important; }

      /* ── ATTENDANCE WIDGET BARS (sidebar left nav) ── */
      .m-widget1__item .progress,
      [class*="m-widget1"] .progress {
        display: block !important;
        width: 100% !important;
        flex-basis: 100% !important;
        height: 8px !important;
        min-height: 8px !important;
        overflow: hidden !important;
        opacity: 1 !important;
        visibility: visible !important;
        margin-top: 8px !important;
        border-radius: 99px !important;
        background: ${c.border} !important;
        position: relative !important;
        z-index: 2 !important;
      }
      .m-widget1__item .progress-bar,
      [class*="m-widget1"] .progress-bar {
        display: block !important;
        height: 8px !important;
        min-height: 8px !important;
        border-radius: 99px !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .m-portlet__body { overflow: visible !important; }

      /* ── ATTENDANCE % BAR in portlet head ── */
      .m-portlet__head .progress {
        display: flex !important;
        visibility: visible !important;
        overflow: hidden !important;
        flex: 1 1 120px !important;
        min-width: 80px !important;
        max-width: 240px !important;
        height: 10px !important;
        min-height: 10px !important;
        border-radius: 99px !important;
        background: rgba(255,255,255,0.15) !important;
        align-self: center !important;
        margin-left: 8px !important;
      }
      .m-portlet__head .progress-bar,
      .m-portlet__head .progress-bar-success,
      .m-portlet__head .progress-bar-info {
        display: block !important;
        visibility: visible !important;
        height: 10px !important;
        min-height: 10px !important;
        border-radius: 99px !important;
        opacity: 1 !important;
      }

      /* ── MODAL ── */
      .modal-content {
        background: ${c.cardBg} !important;
        border: 1px solid ${c.cardBorder} !important;
        border-radius: 20px !important;
        box-shadow: 0 24px 64px rgba(0,0,0,0.3) !important;
        color: ${c.text} !important;
      }

      .modal-header {
        background: ${c.portletHead} !important;
        border-radius: 20px 20px 0 0 !important;
        border-bottom: none !important;
        padding: 20px 24px !important;
      }

      .modal-header * { color: #ffffff !important; }

      .modal-footer {
        border-top: 1px solid ${c.border} !important;
        background: ${c.surfaceAlt} !important;
        border-radius: 0 0 20px 20px !important;
      }

      /* ── CUSTOM SCROLLBAR ── */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: ${c.borderLight};
        border-radius: 99px;
      }
      ::-webkit-scrollbar-thumb:hover { background: ${c.accent}; }

      /* ── SCROLL TO TOP ── */
      #jf-scroll-top {
        position: fixed;
        bottom: 28px;
        right: 28px;
        width: 44px;
        height: 44px;
        background: ${c.accent};
        color: #fff;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        z-index: 99999;
        box-shadow: 0 4px 16px ${c.accentGlow}, 0 2px 8px rgba(0,0,0,0.2);
        font-size: 18px;
        font-weight: 700;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        line-height: 1;
      }
      #jf-scroll-top:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px ${c.accentGlow};
      }

      /* ── JF STATUS BADGE (sidebar bottom) ── */
      #jf-status-badge {
        position: fixed;
        bottom: 16px;
        left: 16px;
        background: ${isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.1)'};
        border: 1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(37,99,235,0.2)'};
        border-radius: 10px;
        padding: 6px 12px;
        font-size: 11px;
        color: ${c.accent};
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace !important;
        z-index: 9998;
        letter-spacing: 0.05em;
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
      }

      #jf-status-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${c.success};
        box-shadow: 0 0 8px ${c.success};
        animation: jf-pulse 2s infinite;
      }

      @keyframes jf-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      /* ── PAGE TRANSITIONS ── */
      .m-content {
        animation: jf-fadein 0.3s ease !important;
      }

      @keyframes jf-fadein {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── BREADCRUMB ── */
      .m-subheader { background: transparent !important; }
      .m-subheader .m-subheader__title { color: ${c.text} !important; font-weight: 700 !important; }
      .m-breadcrumb .m-breadcrumb__item span, .m-breadcrumb .m-breadcrumb__item a {
        color: ${c.textMuted} !important;
        font-size: 12px !important;
      }
      .m-breadcrumb .m-breadcrumb__item:last-child span { color: ${c.accent} !important; }

      /* ── ACCORDION ── */
      .m-accordion .m-accordion__item-head {
        background: ${c.surfaceAlt} !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        border: 1px solid ${c.border} !important;
      }
      .m-accordion .m-accordion__item-head.collapsed {
        border-radius: 10px !important;
      }
      .m-accordion .m-accordion__item-title { color: ${c.text} !important; font-weight: 600 !important; }
    `;

    document.head.appendChild(style);

    // Inject status badge
    if (!document.getElementById('jf-status-badge')) {
      const badge = document.createElement('div');
      badge.id = 'jf-status-badge';
      badge.textContent = 'Flex Prime';
      document.body.appendChild(badge);
    } else {
      document.getElementById('jf-status-badge').textContent = 'Flex Prime';
    }
  }

  // ── ATTENDANCE: inject absent count + fix progress bar ──
  function injectAttendanceEnhancements() {
    if (!window.location.href.includes('StudentAttendance')) return;

    const done = new Set();

    // Remove the "Attendance Percentage:" label + progress bar from portlet heads
    function removeAttendanceBars() {
      document.querySelectorAll('.m-portlet__head .progress').forEach(bar => {
        // Walk up to the direct child of portlet head and remove that whole column
        let target = bar;
        while (target.parentElement && !target.parentElement.classList.contains('m-portlet__head')) {
          target = target.parentElement;
        }
        target.remove();
      });
    }

    function makeBadge(absentCount, presentCount) {
      const total = absentCount + presentCount;
      const pct = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';
      const isLow = parseFloat(pct) < 80;
      const pctColor = isLow ? '#ef4444' : '#22c55e';
      const badge = document.createElement('div');
      badge.className = 'jf-absent-badge';
      badge.style.cssText = `
        display:inline-flex; align-items:center; gap:10px; flex-wrap:wrap;
        background:rgba(220,38,38,0.10); border:1px solid rgba(220,38,38,0.30);
        color:#ef4444; border-radius:8px; padding:7px 14px;
        font-size:12px; font-weight:600;
        font-family:'Plus Jakarta Sans','Inter',sans-serif;
        margin-bottom:12px; margin-top:6px;
        width:100%; box-sizing:border-box;
      `;
      badge.innerHTML = `
        <span>✗ Absents: <strong style="color:#ef4444">${absentCount}</strong></span>
        <span style="color:#64748b">|</span>
        <span style="color:#22c55e">✓ Present: <strong style="color:#22c55e">${presentCount}</strong></span>
        <span style="color:#64748b">|</span>
        <span style="color:#94a3b8">Total: <strong style="color:#94a3b8">${total}</strong></span>
        <span style="color:#64748b">|</span>
        <span style="color:${pctColor}">Attendance: <strong style="color:${pctColor}">${pct}%</strong></span>
        ${isLow ? `<span style="background:rgba(220,38,38,0.2);border:1px solid rgba(220,38,38,0.4);color:#ef4444;border-radius:5px;padding:2px 8px;font-size:11px;">⚠ Below 80%</span>` : ''}
      `;
      return badge;
    }

    function tryInject() {
      // Structure from image 3:
      // Each course is a .tab-pane containing:
      //   div > [course-title-row with progress bar] + table
      // We inject the badge between the title row and the table.

      const panes = document.querySelectorAll('[class*="tab-pane"]');
      panes.forEach(pane => {
        if (done.has(pane.id || pane.className)) return;

        const table = pane.querySelector('table');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        if (!rows.length) return;

        let absentCount = 0, presentCount = 0;
        rows.forEach(tr => {
          const cells = tr.querySelectorAll('td');
          if (!cells.length) return;
          const presence = cells[cells.length - 1]?.textContent?.trim().toUpperCase();
          if (presence === 'A') absentCount++;
          else if (presence === 'P') presentCount++;
        });

        if (absentCount + presentCount === 0) return;

        // Remove old badge
        pane.querySelector('.jf-absent-badge')?.remove();

        const badge = makeBadge(absentCount, presentCount);
        // Insert before the table (or before its wrapper div)
        const tableParent = table.parentElement;
        tableParent.insertBefore(badge, table);

        done.add(pane.id || pane.className);
      });

      // Also handle if attendance is in portlet structure
      document.querySelectorAll('.m-portlet__body').forEach(body => {
        if (done.has('portlet-' + body.className)) return;
        const table = body.querySelector('table');
        if (!table) return;
        const rows = table.querySelectorAll('tbody tr');
        if (!rows.length) return;

        let absentCount = 0, presentCount = 0;
        rows.forEach(tr => {
          const cells = tr.querySelectorAll('td');
          if (!cells.length) return;
          const presence = cells[cells.length - 1]?.textContent?.trim().toUpperCase();
          if (presence === 'A') absentCount++;
          else if (presence === 'P') presentCount++;
        });

        if (absentCount + presentCount === 0) return;
        if (body.querySelector('.jf-absent-badge')) return;

        const badge = makeBadge(absentCount, presentCount);
        const tableParent = table.parentElement;
        tableParent.insertBefore(badge, table);
        done.add('portlet-' + body.className);
      });
    }

    // Multi-pass: data might load async
    [400, 900, 1800, 3500].forEach(ms => setTimeout(() => {
      removeAttendanceBars();
      tryInject();
    }, ms));

    // Re-run on tab clicks (switching between courses)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-toggle="tab"], .nav-link, .nav-tabs a');
      if (link) {
        done.clear();
        [300, 800].forEach(ms => setTimeout(() => { removeAttendanceBars(); tryInject(); }, ms));
      }
    });

    // MutationObserver fallback
    let mutTimer;
    const obs = new MutationObserver(() => {
      clearTimeout(mutTimer);
      mutTimer = setTimeout(() => { removeAttendanceBars(); tryInject(); }, 250);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 90000);
  }

  function injectScrollTopBtn() {
    if (document.getElementById('jf-scroll-top')) return;
    const btn = document.createElement('button');
    btn.id = 'jf-scroll-top';
    btn.innerHTML = '↑';
    btn.style.cssText = 'display:none;';
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function injectSidebarBadges() {
    // Replaced by injectMarksHighlighter below
  }

  // ── MARKS CHANGE HIGHLIGHTER ─────────────────────────────────────────────
  // Runs on StudentMarks page. Compares current marks to stored snapshot.
  // Highlights the course tab pill of any course whose marks have changed.

  function injectMarksHighlighter() {
    if (!window.location.href.includes('Student/StudentMarks')) return;

    // Inject highlight styles
    if (!document.getElementById('jf-highlight-style')) {
      const s = document.createElement('style');
      s.id = 'jf-highlight-style';
      s.textContent = `
        @keyframes jf-tab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,229,192,0.0); }
          50%       { box-shadow: 0 0 0 6px rgba(0,229,192,0.35); }
        }
        .jf-updated-tab {
          border: 2px solid #00e5c0 !important;
          border-radius: 8px !important;
          animation: jf-tab-pulse 1.8s ease-in-out infinite !important;
          position: relative !important;
        }
        .jf-updated-tab::after {
          content: 'UPDATED';
          position: absolute;
          top: -9px;
          right: -4px;
          background: #00e5c0;
          color: #0d0d14;
          font-size: 8px;
          font-weight: 800;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.5px;
          padding: 2px 5px;
          border-radius: 4px;
          line-height: 1;
          pointer-events: none;
          z-index: 9999;
        }
        .jf-marks-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0,229,192,0.08);
          border: 1px solid rgba(0,229,192,0.35);
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 14px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: #00e5c0;
          animation: jf-fadein 0.4s ease;
        }
        .jf-marks-banner .jf-banner-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #00e5c0;
          box-shadow: 0 0 8px #00e5c0;
          flex-shrink: 0;
          animation: jf-tab-pulse 1.5s infinite;
        }
        .jf-marks-banner strong { color: #fff; }
        @keyframes jf-fadein {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(s);
    }

    function scrapeSnapshot() {
      const snapshot = {};
      document.querySelectorAll("div[class*='tab-pane']").forEach(course => {
        const tabId = course.id;
        const title = document.querySelector(`a[href="#${tabId}"]`)?.textContent?.trim() || tabId;
        const rows = [];

        // Total column rows (individual assessment rows)
        course.querySelectorAll('[class*="totalColumn_"]').forEach(row => {
          const obt = row.querySelector('.totalColObtMarks')?.textContent?.trim();
          const wt  = row.querySelector('.totalColweightage')?.textContent?.trim();
          if (obt !== undefined || wt !== undefined) rows.push(`w${wt}:o${obt}`);
        });

        // Calculation rows (quiz/sessional aggregates)
        course.querySelectorAll('.calculationrow').forEach(cr => {
          const avg = cr.querySelector('.AverageMarks')?.textContent?.trim();
          const tot = cr.querySelector('.GrandTotal')?.textContent?.trim();
          if (avg !== undefined) rows.push(`avg${avg}_tot${tot}`);
        });

        if (rows.length > 0) snapshot[title] = rows.join('|');
      });
      return snapshot;
    }

    function highlightCourse(tabLink, courseTitle) {
      if (!tabLink) return;
      tabLink.classList.add('jf-updated-tab');
      // Remove highlight when user clicks on that tab (they've seen it)
      tabLink.addEventListener('click', () => {
        tabLink.classList.remove('jf-updated-tab');
        // Clear just this course from the changed list
        chrome.storage.local.get(['jf_seen_updates'], (r) => {
          const seen = r.jf_seen_updates || [];
          if (!seen.includes(courseTitle)) seen.push(courseTitle);
          chrome.storage.local.set({ jf_seen_updates: seen });
        });
      }, { once: true });
    }

    function showBanner(changedCourses) {
      const body = document.querySelector('.m-portlet__body, .m-content, .m-wrapper');
      if (!body || document.getElementById('jf-update-banner')) return;
      const banner = document.createElement('div');
      banner.id = 'jf-update-banner';
      banner.className = 'jf-marks-banner';
      const names = changedCourses.join(', ');
      banner.innerHTML = `
        <div class="jf-banner-dot"></div>
        <span>Marks updated in <strong>${changedCourses.length} course${changedCourses.length > 1 ? 's' : ''}</strong>: ${names}</span>
      `;
      body.insertBefore(banner, body.firstChild);
    }

    function runHighlighter() {
      const currentSnapshot = scrapeSnapshot();
      if (Object.keys(currentSnapshot).length === 0) return; // Page not loaded yet

      chrome.storage.local.get(['marks_snapshot', 'jf_seen_updates'], (res) => {
        const seen = res.jf_seen_updates || [];

        if (!res.marks_snapshot) {
          // First visit — save baseline, nothing to highlight
          chrome.storage.local.set({ marks_snapshot: JSON.stringify(currentSnapshot) });
          return;
        }

        const prevSnapshot = JSON.parse(res.marks_snapshot);
        const changed = [];

        for (const courseTitle in currentSnapshot) {
          if (seen.includes(courseTitle)) continue; // Already acknowledged
          if (prevSnapshot[courseTitle] !== currentSnapshot[courseTitle]) {
            changed.push(courseTitle);
          }
        }

        if (changed.length > 0) {
          // Highlight each changed course tab
          changed.forEach(courseTitle => {
            // Find the nav tab link for this course
            const allLinks = document.querySelectorAll('.nav-tabs a, .nav-tabs .nav-link, [role="tab"]');
            let found = null;
            allLinks.forEach(link => {
              if (link.textContent.trim().includes(courseTitle) || courseTitle.includes(link.textContent.trim())) {
                found = link;
              }
            });
            highlightCourse(found, courseTitle);
          });
          showBanner(changed);
        }

        // Always update snapshot to latest real values
        chrome.storage.local.set({ marks_snapshot: JSON.stringify(currentSnapshot) });
      });
    }

    // Run after page data loads (marks page uses AJAX)
    [600, 1200, 2500].forEach(ms => setTimeout(runHighlighter, ms));
  }

  // Kick off marks highlighter on marks pages
  if (window.location.href.includes('Student/StudentMarks')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(injectMarksHighlighter, 400));
    } else {
      setTimeout(injectMarksHighlighter, 400);
    }
  }
})();