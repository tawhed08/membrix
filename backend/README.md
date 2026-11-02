# Backend configuration

## Contact form delivery

The public contact form submits to `POST /api/contact`. Configure the following
backend environment variables to enable delivery:

- `CONTACT_EMAIL`: mailbox that receives contact inquiries.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`: SMTP transport settings.
- `SMTP_SECURE`: set to `true` when the SMTP connection uses TLS.
- `SMTP_FROM` (optional): verified sender address; defaults to `SMTP_USER`.

The API returns an error when the recipient or SMTP configuration is missing, or
when the mail provider does not accept a message. The endpoint applies a
process-local limit of five requests per IP address per fifteen minutes.

## Payments and renewals

Administrators configure bKash, Nagad, and bank recipient details in
**Admin → Settings → Payment Configuration**. These non-secret payout details
are stored in the `PaymentSettings` collection. The public checkout endpoint
returns only the configured recipient details and enabled methods; gateway
credentials are never returned by an API.

AamarPay has a separate enable switch and sandbox/live selector in the same
admin section, so it can be enabled alongside any manual methods. Admin-entered
store IDs and signature keys are encrypted at rest in `PaymentSettings` using
AES-256-GCM. Set `PAYMENT_SETTINGS_ENCRYPTION_KEY` to a private, stable value of
at least 32 characters on the backend before saving merchant credentials.
`JWT_SECRET` is a fallback encryption key; rotating the active encryption key
requires re-entering the stored gateway credentials.

For backwards-compatible environment configuration, AamarPay can also use:

- `AAMARPAY_MODE`: `sandbox` or `live`.
- `AAMARPAY_BASE_URL`: `https://sandbox.aamarpay.com` for sandbox or
  `https://secure.aamarpay.com` for live.
- `AAMARPAY_STORE_ID` and `AAMARPAY_SIGNATURE_KEY`: merchant credentials.
- `FRONTEND_URL` and `BACKEND_URL`: public application origins.

The backend initiates checkout and verifies callback transactions server-side,
checking merchant, transaction ID, amount, and currency before activation.
Manual submissions remain pending until an administrator approves them.
Production processing requires valid production merchant credentials and
successful end-to-end testing; no credentials are provided by the application.
Authenticated members can download completed-payment receipts from
`GET /api/payments/:paymentId/receipt`. The API checks payment ownership,
completed status, and payment/membership/plan consistency before generating a
PDF. Receipt numbers are deterministic from the existing payment ID, so no
additional receipt collection or migration is needed.
The current AamarPay integration does not enable recurring billing, so members
renew manually and automatic charging is shown as unavailable. Membership
reminders use the existing daily scheduler and in-app notification collection.

Certificate verification is available at `/verify-certificate` and
`/verify-certificate/:certificateId`. Public verification is rate-limited per
backend process. Certificate details and cross-match results are checked
against MongoDB snapshots; verification attempts are recorded in
`VerificationLog`. Administrators manage, compare, revoke, and audit
certificates from **Admin → Certificates**.
