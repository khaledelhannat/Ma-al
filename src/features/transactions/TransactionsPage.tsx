import { PageContainer, EmptyState } from '../../components/ui';

export function TransactionsPage() {
  return (
    <PageContainer title="Transactions">
      <EmptyState
        title="Not implemented yet"
        description="Income, expense, and transfer tracking will appear here once the transaction ledger is built."
      />
    </PageContainer>
  );
}
