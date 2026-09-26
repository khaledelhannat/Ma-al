export interface NavItem {
  path: string;
  label: string;
}

/**
 * Single source of truth for top-level navigation. Both the sidebar and
 * the route table are derived from this list so they can't drift apart.
 */
export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/assets', label: 'Assets' },
  { path: '/goals', label: 'Goals' },
  { path: '/wishlist', label: 'Wishlist' },
  { path: '/budgets', label: 'Budgets' },
  { path: '/settings', label: 'Settings' },
];
