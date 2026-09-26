import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import styles from './AppLayout.module.css';

/**
 * Top-level application shell. Establishes the header/sidebar/content
 * regions used by every route. On narrow viewports the sidebar becomes
 * an off-canvas panel toggled from the header.
 */
export function AppLayout() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Header onToggleNav={() => setIsNavOpen((open) => !open)} />
      <div className={styles.body}>
        <aside
          className={
            isNavOpen
              ? `${styles.sidebarPanel} ${styles.sidebarPanelOpen}`
              : styles.sidebarPanel
          }
        >
          <Sidebar onNavigate={() => setIsNavOpen(false)} />
        </aside>
        {isNavOpen ? (
          <div
            className={styles.scrim}
            role="presentation"
            onClick={() => setIsNavOpen(false)}
          />
        ) : null}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
