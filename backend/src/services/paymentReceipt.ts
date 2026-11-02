import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

export type PaymentReceiptKind = "submission" | "final";

export interface PaymentReceiptData {
  kind: PaymentReceiptKind;
  receiptNumber: string;
  issuedAt: Date;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  organizationName: string;
  membershipId: string;
  planName: string;
  amount: number;
  currency: string;
  method: string;
  serviceProvider: string;
  transactionId: string | null;
  gatewayTransactionId: string | null;
  submittedAt: Date;
  completedAt: Date | null;
}

const FONT_PATH = path.resolve(
  __dirname,
  "../../assets/NotoSansBengali[wdth,wght].ttf",
);
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 48;
const RIGHT = PAGE_WIDTH - LEFT;
const CONTENT_WIDTH = RIGHT - LEFT;
const FOOTER_TOP = PAGE_HEIGHT - 82;
const COLORS = {
  background: "#F4F1E9",
  surface: "#FBF9F4",
  surfaceAlt: "#EAE5D9",
  foreground: "#211D17",
  muted: "#777065",
  border: "#DED7C9",
  brand: "#B88B48",
  brightGold: "#D3AD70",
  goldContrast: "#1D160C",
  darkPanel: "#191814",
  darkPanelAlt: "#25221C",
};

function formatAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currency.toUpperCase()} ${formatted}`;
}

function formatDate(date: Date): string {
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });
}

function drawPageBackground(document: PDFKit.PDFDocument): void {
  document
    .save()
    .rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    .fill(COLORS.background)
    .restore();
}

function drawHeader(
  document: PDFKit.PDFDocument,
  receipt: PaymentReceiptData,
  continued = false,
): void {
  document
    .roundedRect(LEFT, 39, 130, 39, 4)
    .fill(COLORS.darkPanel)
    .roundedRect(LEFT + 6, 45, 118, 27, 3)
    .fill(COLORS.darkPanelAlt);

  document
    .font("Membrix-Bold")
    .fontSize(19)
    .fillColor(COLORS.surface)
    .text("Membrix", LEFT + 13, 47, { continued: true })
    .fillColor(COLORS.brightGold)
    .text(".");

  document
    .font("Membrix-Bold")
    .fontSize(12.5)
    .fillColor(COLORS.foreground)
    .text(
      continued
        ? "PAYMENT DETAILS (CONTINUED)"
        : receipt.kind === "submission"
          ? "PAYMENT SUBMISSION RECEIPT"
          : "PAYMENT RECEIPT",
      LEFT + 145,
      42,
      { width: CONTENT_WIDTH - 145, align: "right" },
    );

  document
    .font("Membrix")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(`Receipt no.  ${receipt.receiptNumber}`, LEFT + 145, 63, {
      width: CONTENT_WIDTH - 145,
      align: "right",
    })
    .text(`Issued  ${formatDate(receipt.issuedAt)}`, LEFT + 145, 77, {
      width: CONTENT_WIDTH - 145,
      align: "right",
    });

  document
    .moveTo(LEFT, 111)
    .lineTo(RIGHT, 111)
    .lineWidth(1.3)
    .strokeColor(COLORS.brand)
    .stroke();
}

function drawSectionHeader(
  document: PDFKit.PDFDocument,
  title: string,
  y: number,
): number {
  document
    .roundedRect(LEFT, y, CONTENT_WIDTH, 24, 2)
    .fill(COLORS.surfaceAlt)
    .rect(LEFT, y, 3, 24)
    .fill(COLORS.brand)
    .font("Membrix-Bold")
    .fontSize(8)
    .fillColor(COLORS.brand)
    .text(title.toUpperCase(), LEFT + 12, y + 7, {
      width: CONTENT_WIDTH - 20,
      characterSpacing: 0.6,
    });
  return y + 24;
}

function drawSummary(
  document: PDFKit.PDFDocument,
  receipt: PaymentReceiptData,
  y: number,
): number {
  const width = CONTENT_WIDTH / 3;
  const summaryHeight = 59;
  const summary = [
    ["PAYMENT PROVIDER", receipt.serviceProvider],
    ["MEMBERSHIP PLAN", receipt.planName],
    ["AMOUNT", formatAmount(receipt.amount, receipt.currency)],
  ];

  summary.forEach(([label, value], index) => {
    const x = LEFT + index * width;
    document
      .rect(x, y, width, summaryHeight)
      .fillAndStroke(
        index % 2 === 0 ? COLORS.surface : COLORS.surfaceAlt,
        COLORS.border,
      )
      .font("Membrix-Bold")
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(label, x + 10, y + 11, { width: width - 20 })
      .font("Membrix-Bold")
      .fontSize(index === 2 ? 11 : 9)
      .fillColor(index === 2 ? COLORS.brand : COLORS.foreground)
      .text(value, x + 10, y + 28, {
        width: width - 20,
        height: 23,
        ellipsis: true,
      });
  });
  return y + summaryHeight;
}

function drawStatus(
  document: PDFKit.PDFDocument,
  receipt: PaymentReceiptData,
  y: number,
): number {
  const isPending = receipt.kind === "submission";
  const background = isPending ? COLORS.surfaceAlt : COLORS.brand;
  const foreground = isPending ? COLORS.brand : COLORS.goldContrast;
  const status = isPending
    ? "PENDING — AWAITING ADMIN VERIFICATION"
    : "PAID — PAYMENT VERIFIED";

  const statusBox = document.roundedRect(LEFT, y, CONTENT_WIDTH, 32, 3);
  if (isPending) {
    statusBox.fillAndStroke(background, COLORS.brand);
  } else {
    statusBox.fill(background);
  }
  document
    .font("Membrix-Bold")
    .fontSize(9.5)
    .fillColor(foreground)
    .text(status, LEFT + 12, y + 10, {
      width: CONTENT_WIDTH - 24,
      align: "center",
    });
  return y + 32;
}

function buildRows(receipt: PaymentReceiptData): Array<[string, string]> {
  return [
    ["Member name", receipt.memberName],
    ["Registered email", receipt.memberEmail],
    ...(receipt.memberPhone ? [["Mobile number", receipt.memberPhone] as [string, string]] : []),
    ...(receipt.organizationName
      ? [["Organization", receipt.organizationName] as [string, string]]
      : []),
    ["Membership ID", receipt.membershipId],
    ["Plan name", receipt.planName],
    ["Payment method", receipt.method],
    ["Payment provider", receipt.serviceProvider],
    ["Amount", formatAmount(receipt.amount, receipt.currency)],
    ["Transaction ID", receipt.transactionId || "—"],
    ...(receipt.gatewayTransactionId
      ? [["Gateway transaction ID", receipt.gatewayTransactionId] as [string, string]]
      : []),
    ["Payment submitted", formatDate(receipt.submittedAt)],
    ...(receipt.completedAt
      ? [["Payment verified", formatDate(receipt.completedAt)] as [string, string]]
      : []),
    [
      "Payment status",
      receipt.kind === "submission"
        ? "PENDING — AWAITING ADMIN VERIFICATION"
        : "COMPLETED — VERIFIED",
    ],
  ];
}

function drawRows(
  document: PDFKit.PDFDocument,
  receipt: PaymentReceiptData,
  rows: Array<[string, string]>,
  startY: number,
): number {
  const labelWidth = 147;
  const valueX = LEFT + labelWidth;
  const valueWidth = CONTENT_WIDTH - labelWidth;
  let y = startY;

  rows.forEach(([label, value], index) => {
    const valueHeight = document
      .font("Membrix-Bold")
      .fontSize(9)
      .heightOfString(value, { width: valueWidth - 20, lineGap: 2 });
    const rowHeight = Math.max(27, valueHeight + 14);

    if (y + rowHeight > FOOTER_TOP - 28) {
      document.addPage({ size: "A4", margins: { top: 38, right: LEFT, bottom: 45, left: LEFT } });
      drawPageBackground(document);
      drawHeader(document, receipt, true);
      y = 157;
    }

    document
      .rect(LEFT, y, CONTENT_WIDTH, rowHeight)
      .fill(index % 2 === 0 ? COLORS.surface : COLORS.surfaceAlt)
      .rect(LEFT, y, CONTENT_WIDTH, rowHeight)
      .lineWidth(0.45)
      .strokeColor(COLORS.border)
      .stroke();
    document
      .moveTo(valueX, y)
      .lineTo(valueX, y + rowHeight)
      .lineWidth(0.45)
      .strokeColor(COLORS.border)
      .stroke();
    document
      .font("Membrix")
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(label, LEFT + 10, y + 8, {
        width: labelWidth - 20,
        height: rowHeight - 12,
        lineGap: 1,
      })
      .font("Membrix-Bold")
      .fontSize(9)
      .fillColor(COLORS.foreground)
      .text(value, valueX + 10, y + 7, {
        width: valueWidth - 20,
        height: rowHeight - 10,
        lineGap: 2,
      });
    y += rowHeight;
  });

  return y;
}

export function buildPaymentReceiptPdf(
  receipt: PaymentReceiptData,
): Promise<Buffer> {
  if (!existsSync(FONT_PATH)) {
    return Promise.reject(
      new Error("The embedded receipt font is missing from the backend assets."),
    );
  }

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margins: { top: 38, right: LEFT, bottom: 45, left: LEFT },
      info: {
        Title:
          receipt.kind === "submission"
            ? "Membrix Payment Submission Receipt"
            : "Membrix Payment Receipt",
        Author: "Membrix",
        Subject: `Receipt ${receipt.receiptNumber}`,
      },
    });
    const chunks: Buffer[] = [];

    document.registerFont("Membrix", FONT_PATH);
    document.registerFont("Membrix-Bold", FONT_PATH);
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.once("error", reject);
    document.once("end", () => resolve(Buffer.concat(chunks)));

    drawPageBackground(document);
    drawHeader(document, receipt);
    let y = drawStatus(document, receipt, 128) + 12;
    y = drawSectionHeader(document, "Payment summary", y);
    y = drawSummary(document, receipt, y);
    y += 14;
    y = drawSectionHeader(document, "Payment details", y);
    y = drawRows(document, receipt, buildRows(receipt), y);

    if (receipt.kind === "submission") {
      const disclaimer =
        "This document confirms that your payment information has been submitted successfully. It does not confirm payment approval or membership activation. Your membership will be activated only after successful payment verification.";
      const disclaimerHeight = document.heightOfString(disclaimer, {
        width: CONTENT_WIDTH - 24,
        lineGap: 2,
      });
      if (y + disclaimerHeight + 23 > FOOTER_TOP - 20) {
        document.addPage();
        drawPageBackground(document);
        drawHeader(document, receipt, true);
        y = 158;
      }
      document
        .roundedRect(LEFT, y + 11, CONTENT_WIDTH, disclaimerHeight + 20, 3)
        .fill(COLORS.surfaceAlt)
        .rect(LEFT, y + 11, 3, disclaimerHeight + 20)
        .fill(COLORS.brand)
        .font("Membrix-Bold")
        .fontSize(8)
        .fillColor(COLORS.foreground)
        .text(disclaimer, LEFT + 12, y + 21, {
          width: CONTENT_WIDTH - 24,
          lineGap: 2,
        });
    }

    document
      .moveTo(LEFT, FOOTER_TOP)
      .lineTo(RIGHT, FOOTER_TOP)
      .lineWidth(2)
      .strokeColor(COLORS.brand)
      .stroke()
      .font("Membrix")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        receipt.kind === "submission"
          ? "Submission receipt only — not proof of payment approval."
          : "Thank you for choosing Membrix.",
        LEFT,
        FOOTER_TOP + 13,
        { width: CONTENT_WIDTH, align: "center" },
      );
    document.end();
  });
}
