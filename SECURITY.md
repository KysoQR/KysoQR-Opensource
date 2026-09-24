# Security Policy

KysoQR handles real digital signatures and certificate verification. If you find a vulnerability — especially anything that could let a signature or certificate chain pass verification when it shouldn't — please report it privately, not through a public GitHub Issue.

## Reporting a vulnerability

Preferred: use GitHub's private vulnerability reporting for this repository (**Security** tab → **Report a vulnerability**). This opens a private advisory visible only to maintainers until a fix is ready.

Please include:
- A description of the issue and its potential impact.
- Steps to reproduce (a minimal PDF/signature sample if relevant — do not include real, sensitive documents).
- Which part of the flow is affected (signing vs. verification, and which module).

## Scope

This covers the KysoQR CE application code in this repository — in particular the signature/certificate verification logic in `lib/verification/` and `lib/trustStore/`. It does not cover third-party services this project integrates with (e.g. the CAS e-signing API) — please report issues in those services to their own maintainers.

## Response

We aim to acknowledge reports within a reasonable time and will credit reporters (unless you prefer to stay anonymous) once a fix is released.
