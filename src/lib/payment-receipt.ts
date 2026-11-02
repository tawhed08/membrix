export async function downloadPaymentReceipt(
  apiUrl: string,
  paymentId: string,
  kind: "submission" | "final" = "final",
): Promise<void> {
  const receiptPath =
    kind === "submission" ? "submission-receipt" : "receipt";
  const response = await fetch(
    `${apiUrl}/api/payments/${encodeURIComponent(paymentId)}/${receiptPath}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = "Unable to download the payment receipt.";
    try {
      const body: unknown = await response.json();
      if (
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch {
      // Keep the useful default message for non-JSON API errors.
    }
    throw new Error(message);
  }

  if (!response.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error("The server did not return a PDF receipt.");
  }

  const receipt = await response.blob();
  const objectUrl = URL.createObjectURL(receipt);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `Membrix-${kind === "submission" ? "submission" : "payment"}-receipt-${paymentId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
