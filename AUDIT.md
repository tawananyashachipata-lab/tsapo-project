# Tsapo initial audit — 12 November 2026

## Existing service (before changes)
- The website and tools point to the same existing Lovable Cloud backend. The owner chose to keep it. No replacement project or data migration is needed.
- The backend is healthy. All 16 application tables have row-level security enabled; shipment, location, agent, payment and conversation relationships exist.
- Existing records: 1 account/profile, 1 approved agent, 1 awaiting-agent parcel, 1 payment, 1 notification, 25 locations and 8 parcel categories. These records must remain intact.
- Eight existing automated tests pass. They cover phone formatting, chat input/tracking parsing, conversation ownership and the home route—not every business workflow.
- Booking, tracking, cancellation, status changes, pickup verification and payment confirmation already call database functions. Agent applications/approvals and support use row-secured tables. These are real integrations, not proof that every flow works.

## Confirmed defects and security findings
- Support submits category `general`, but the database accepts only `missing`, `damaged`, `question` and `other`; current submissions fail.
- Most privileged database functions retain default anonymous execution privileges. In particular, cancellation's null-sensitive identity check needs an explicit sign-in check. Internal notification helpers should not be remotely callable.
- Recipient matching trusts editable profile email/phone fields; changing a profile can impersonate a shipment recipient. Use verified account identity instead.
- Pickup verification lacks explicit missing/used-code checks and strict six-digit input validation.
- Booking lookups, admin queries and notifications often discard query errors and display empty results, hiding failures.
- My parcels treats every visible non-owned shipment as incoming, including admin/agent-visible shipments.
- Agent desk offers next actions without checking which agent/location owns each step.
- Uploads are private and limited to 5 MB, but the bucket has no image MIME restrictions; uploaded photos are not displayed in shipment dashboards.
- Production currently writes `.output/`, while the preview deployer expects `dist/`. Vercel support needs an explicit adapter/configuration and deployment checks.

## Not yet verified / limits
- Registration email delivery, password sign-in/recovery, sender/recipient isolation, agent approval and full handover must be tested, not inferred from source.
- In-app notifications exist. SMS/email shipment delivery and automatic EcoCash/OneMoney/bank settlement are not implemented; payments currently require a genuine administrator/agent confirmation.
- AI uses a server-only Lovable gateway key; independently hosting the frontend does not make the managed AI/backend independent.
- The existing Cloud connection cannot be disconnected in this editor. Cloud service-role credentials are not exportable. GitHub/Vercel deployment must retain the existing backend and cannot claim total backend independence.

## Verification results
Pending repairs and live checks. No existing records have been changed by this audit.