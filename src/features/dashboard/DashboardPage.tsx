import { PageContainer, EmptyState } from '../../components/ui';

export function DashboardPage() {
  return (
    <PageContainer title="Dashboard">
      <EmptyState
        title="Not implemented yet"
        description="This is where your overall financial picture will live, including net worth, spendable money, and progress toward your goals."
      />
    </PageContainer>
  );
}
