type PaymentRecord = {
  user: unknown;
  membership: unknown;
  plan: unknown;
  amount: number;
  currency: string;
};

type MembershipRecord = {
  _id: unknown;
  user: unknown;
  plan: unknown;
};

type PlanRecord = {
  _id: unknown;
  price: number;
};

function id(value: unknown): string {
  if (value && typeof value === "object" && "toHexString" in value) {
    const toHexString = value.toHexString;
    if (typeof toHexString === "function") {
      return toHexString.call(value).toLowerCase();
    }
  }
  return String(value ?? "").toLowerCase();
}

function minorUnits(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function isPaymentReceiptEligible(status: string): boolean {
  return status === "completed";
}

export function isFinalReceiptEligible(
  status: string,
  method: string,
): boolean {
  return (
    isPaymentReceiptEligible(status) &&
    (method === "bkash" ||
      method === "nagad" ||
      method === "bank" ||
      method === "online")
  );
}

export function isManualSubmissionReceiptEligible(
  status: string,
  method: string,
): boolean {
  return (
    status === "pending" &&
    (method === "bkash" || method === "nagad" || method === "bank")
  );
}

export function getActivationIntegrityIssue(
  payment: PaymentRecord,
  membership: MembershipRecord,
  plan: PlanRecord | null,
): string | null {
  if (id(payment.user) !== id(membership.user)) {
    return "payment_membership_user_mismatch";
  }
  if (id(payment.membership) !== id(membership._id)) {
    return "payment_membership_reference_mismatch";
  }
  if (id(payment.plan) !== id(membership.plan)) {
    return "payment_membership_plan_mismatch";
  }
  if (!plan || id(plan._id) !== id(membership.plan)) {
    return "membership_plan_record_mismatch";
  }
  if (payment.currency.trim().toUpperCase() !== "BDT") {
    return "payment_currency_mismatch";
  }
  const paymentAmount = minorUnits(payment.amount);
  const planAmount = minorUnits(plan.price);
  if (paymentAmount === null || planAmount === null || paymentAmount !== planAmount) {
    return "payment_plan_amount_mismatch";
  }
  return null;
}
