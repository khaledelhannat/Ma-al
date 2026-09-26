import styles from './Header.module.css';

export interface HeaderProps {
  onToggleNav: () => void;
}

export function Header({ onToggleNav }: HeaderProps) {
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.navToggle}
        onClick={onToggleNav}
        aria-label="Toggle navigation"
      >
        <span className={styles.navToggleIcon} aria-hidden="true" />
      </button>
      <span className={styles.brand}>Personal Financial Intelligence</span>
    </header>
  );
}
