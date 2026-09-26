import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Neutral placeholder used by feature pages that don't have real
 * functionality yet. Not an error state — just "nothing here yet".
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
