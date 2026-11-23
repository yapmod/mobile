// Match Yapin’s mobile breakpoint and keep the bar and its reserved space in sync.
const mobileLayout = `
  @media (max-width: 760px) {
    .app .sidebar-head,
    .app .main-head {
      --yapmod-header-padding: calc(env(safe-area-inset-top, 0px) + 4px);
      box-sizing: border-box;
      padding-top: var(--yapmod-header-padding);
      height: calc(48px + var(--yapmod-header-padding));
    }

    .app:is(.mobile-nav, .mobile-tabs):not(.chat-open) {
      --yapmod-tab-height: calc(48px + env(safe-area-inset-bottom, 0px));
    }

    .app:is(.mobile-nav, .mobile-tabs):not(.chat-open) .nl-tabbar:not(.kb-up) {
      height: var(--yapmod-tab-height);
    }

    .app:is(.mobile-nav, .mobile-tabs):not(.chat-open) .stage-row {
      padding-bottom: var(--yapmod-tab-height);
    }
  }
`;

export function layoutScript(origin: string): string {
  return `(function () {
    if (window !== window.top || location.origin !== ${JSON.stringify(origin)}) return;
    const id = 'yapmod-mobile-layout';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = ${JSON.stringify(mobileLayout)};
    document.head.append(style);
  })(); true;`;
}
