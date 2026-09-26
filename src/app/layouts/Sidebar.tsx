import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../navigation';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="Primary">
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
