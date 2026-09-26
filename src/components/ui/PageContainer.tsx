import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

export interface PageContainerProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Standard page wrapper: consistent heading + max-width content area.
 * Feature pages should render inside this rather than rolling their own
 * top-level layout.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
}: PageContainerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
