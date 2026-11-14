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
### Repairs and live checks — 14 November 2026
- Latest automatic production check reports `build OK`; the missing `dist/` error and strict TypeScript errors were corrected.
- All 17 automated tests pass, including agent-stage permissions, verified recipient classification, allowed support categories, 5 MB image validation, conversation ownership and split AI-stream errors.
- The original parcel `TSP-137E-940168` still has its original description and `awaiting_agent` status. No existing records were deleted.
- A clearly marked **TEST ONLY** parcel `TSP-6C05-928338` was created through the real booking form, with a private photo, same-town 2 kg Clothing quote of $4.50, cash-at-agent payment record and six-digit pickup code. It read back in My parcels with the photo and code.
- Its booking notification read back in Updates and a mark-read action succeeded.
- The real agent desk received, dispatched, marked arrival and made the test parcel ready. A wrong code was rejected; the correct code changed that test parcel to `collected`. Public tracking showed all seven events and the final state.
- A marked test support request submitted successfully. An administrator's test reply saved and read back under the sender's Help tab.
- An authenticated AI question streamed real pickup-code guidance without revealing a code. No AI error alert or browser runtime error occurred.
- Public tracking and the agent directory work signed out. Signed-out admin navigation redirects to sign-in. Invalid password login is rejected; sign-out returns to sign-in.
- The dashboard, admin, agent, booking, agent directory and assistant pages were checked at 390×844; each had no horizontal overflow or error alert. Existing design was retained.
- All 16 application tables retain RLS. Anonymous cancellation and direct notification-helper execution are denied; public quote/tracking and authenticated RLS helpers remain callable. The database linter's remaining anonymous definer calls are the two intended public reads; signed-in definer operations still require case-by-case authorization rather than treating linter warnings as proof of vulnerability or security.

### Deployment preparation and outstanding checks
- Added explicit Vercel adapter configuration, a blank non-secret environment example, GitHub automated tests and detailed deployment instructions. Production configuration no longer imports the legacy path-resolution plugin and does not import editor-only Lovable plugins.
- No Vercel account was connected or deployment performed. Deployment, final-domain confirmation/recovery redirects and AI portability remain **unverified**.
- Confirmation-required registration settings were read from the hosted Auth service: email signup enabled, automatic confirmation disabled and anonymous accounts disabled. Actual confirmation-email delivery, successful password sign-in and password recovery were not exercised with a consenting test mailbox/password, so they are **not certified complete**.
- No real payment was falsely confirmed. Payment review data loads, but administrator/cash verification and automatic mobile-money settlement are **not verified**; settlement is not integrated.
- Agent approval/suspension, main-admin role changes and multi-account sender/recipient isolation were not changed on existing accounts merely to test them. They require a designated test account before being certified end to end.
- The owner declined the storage-settings action; the existing private bucket and 5 MB limit were left unchanged. Photo access policies and supported image upload checks were repaired without deleting objects.
- The platform rejected editing its managed `.gitignore`; it was left unchanged. Outside this editor, the repository owner should exclude local `.env`/`.vercel` files before adding private deployment credentials. The committed environment example contains no credentials.
- Existing Lovable Cloud and AI cannot be called fully independent: Cloud cannot be disconnected here and its service-role credentials cannot be exported. Editor-only preview dependencies remain necessary inside this workspace, but are not imported by the standalone production configuration.