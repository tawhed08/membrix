export function isManualPaymentReviewable(payment: {
  method?: string;
  status?: string;
}): boolean {
  const method = payment.method?.toLowerCase();
  return (
    (method === "bkash" ||
      method === "nagad" ||
      method === "bank" ||
      method === "bank_transfer") &&
    (payment.status === "pending" || payment.status === "processing")
  );
}
