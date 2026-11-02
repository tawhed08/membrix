export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "failed"
  | "refunded";

export type PaymentStatusFilter = "All" | PaymentStatus;

export interface SearchablePayment {
  id: string;
  transactionId: string | null;
  planName: string;
  method: string;
  status: PaymentStatus;
}

export function filterPaymentRecords<T extends SearchablePayment>(
  payments: T[],
  searchQuery: string,
  statusFilter: PaymentStatusFilter,
): T[] {
  const query = searchQuery.trim().toLowerCase();
  return payments.filter((payment) => {
    const matchesStatus =
      statusFilter === "All" ||
      payment.status === statusFilter;
    if (!matchesStatus) return false;

    return `${payment.id} ${payment.transactionId ?? ""} ${payment.planName} ${payment.method} ${payment.status}`
      .toLowerCase()
      .includes(query);
  });
}
