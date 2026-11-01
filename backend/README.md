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
