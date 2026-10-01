# FixRight

> **Something broken? We’ll find someone who can fix it.**

FixRight is a repair-booking marketplace that connects customers with available, verified technicians who cover their area.

Instead of browsing a huge directory and calling technicians one by one, customers describe what is broken, share where they are, choose when they are available, and FixRight handles the matching and booking flow.

**Product loop:** Find → Match → Book → Pay → Fix

---

## The Problem

When something breaks, finding someone reliable to fix it can be harder than the repair itself.

Customers often have to:

- Search through random listings
- Call multiple technicians
- Explain the same problem repeatedly
- Ask whether someone covers their area
- Negotiate availability
- Wonder whether the technician is legitimate
- Arrange payment before knowing whether anyone is actually coming

FixRight turns that fragmented process into one guided booking experience.

---

## The Solution

FixRight asks the customer four simple questions:

1. **What needs fixing?**
2. **Where is it?**
3. **When are you available?**
4. **Confirm the technician and booking**

The system then matches the request against verified technicians who:

- Offer the requested service
- Are currently available
- Cover the customer's state/LGA
- Are eligible to receive new requests

The customer does not need to browse a directory or manually compare technicians.

---

## Customer Flow

```text
Customer
   │
   ▼
What needs fixing?
   │
   ▼
Share location
   │
   ▼
Choose availability
   │
   ▼
FixRight matches eligible technicians
   │
   ▼
Technician accepts
   │
   ▼
Customer pays ₦1,000 service-call fee
   │
   ▼
Appointment confirmed
   │
   ▼
Technician completes the job
```

---

## Area-Based Matching

FixRight uses **state and LGA coverage**, not distance-based matching.

Technicians choose:

- A state
- Either every LGA in that state
- Or specific LGAs they regularly serve

Customers provide:

- Their address
- Their state
- Their LGA

A technician is eligible only when their selected service coverage includes the customer's area.

There is:

- No travel-radius calculation
- No distance-based matching
- No geofencing
- No customer-facing coordinates

This makes the matching logic predictable and easy to understand.

---

## Payment Only After Technician Acceptance

Customers do not pay when they initially submit a repair request.

The flow is:

Request submitted
↓
Technician accepts
↓
Customer sees exact technician + proposed visit
↓
Customer pays ₦1,000 service-call fee
↓
Payment verified
↓
Appointment confirmed

The ₦1,000 payment is a **service-call/diagnostic fee**.

Labor and parts are separate.

If no technician accepts the request, the customer does not pay.

---

## Paystack Payment Verification

FixRight uses Paystack in test mode.

Payment confirmation is handled server-side.

The server verifies:

- Paystack reference
- Transaction status
- Exact expected amount
- NGN currency
- Matching repair request/payment attempt

An appointment is created only after successful verification.

Payment confirmation is designed to be idempotent so refreshing the page, reopening a payment result, or receiving a webhook does not create duplicate appointments.

### Payment Race Protection

FixRight stores payment attempts so multiple checkout attempts cannot silently replace one another.

Before starting a new checkout, the server checks whether an earlier payment attempt has already completed.

The Paystack webhook also verifies its signature before processing the event.

---

## Technician Verification

Technicians do not automatically become publicly available after signing up.

New technician accounts begin as:

- Pending
- Verified
- Rejected
- Suspended

Admins can review technicians and approve, reject, or suspend them.

Only verified and eligible technicians can receive or accept repair requests.

Demo technicians used for the product demonstration are already verified and available.

---

## Customer Features

Customers can:

- Create an account
- Browse available repair categories
- Start a repair request
- Describe the problem
- Search for their address
- Use their current location
- Adjust the map pin
- Confirm their state and LGA
- Select an availability window
- See when a technician accepts
- Pay securely through Paystack
- View confirmed appointments
- Track repair progress
- Book another repair

---

## Technician Features

Technicians can:

- Create an account
- Complete their technician profile
- Upload a profile photo
- Add years of experience
- Select services they provide
- Select their operating state
- Select the LGAs they cover
- Set their availability
- Receive eligible repair requests
- Accept or decline requests
- View accepted jobs
- Update job status
- Manage their profile
- Receive browser notifications for new requests

Technician job statuses include:

- On the way
- Arrived
- In progress
- Completed

---

## Technician Notifications

Technicians can enable browser notifications for new eligible repair requests.

Notifications:

- Require explicit browser permission
- Are deduplicated
- Do not repeatedly alert for the same request
- Work while FixRight remains open or in the background
- Poll for new eligible requests periodically
- Open the existing FixRight page when clicked

The dashboard also shows the number of new requests.

Notifications use the same eligibility rules as the repair matching system.

---

## Admin Features

Admins can:

- Review technicians
- Approve technicians
- Reject technicians
- Suspend technicians
- Review customers
- Review repair requests
- Review appointments
- Manage services

Admin actions are protected server-side and require the admin role.

---

## Location Handling

FixRight uses Mapbox for address search and map interaction.

Customers can:

- Search for an address
- Prioritize Nigerian address results
- Use their current location
- Drag the map pin
- Confirm the selected location

The application stores the relevant address/state/LGA information needed for matching.

Customers do not need to see raw coordinates.

When Mapbox cannot confidently determine a specific LGA, FixRight asks the customer to select the LGA instead of guessing.

---

## Security

FixRight includes server-side authorization across customer, technician, and admin actions.

Security checks include:

- Signed-in user verification
- Server-side role verification
- Ownership checks for customer records
- Technician request eligibility checks
- Admin-only actions
- Explicit allowed fields for mutations
- Server-side input validation
- Date validation
- Time-window validation
- State/LGA validation
- Payment verification
- Paystack webhook signature verification
- Payment idempotency
- Rate limits on repeated user actions
- Secure handling of environment variables

Users cannot change sensitive fields such as:

- Account role
- Technician verification status
- Payment status
- Service fee
- Assigned technician

from the browser.

---

## Security Audit

A dedicated security audit was performed before launch preparation.

The audit identified and fixed six important issues:

### 1. Payment attempts could be lost

Multiple checkout attempts could previously cause a payment reference to be replaced.

A dedicated `payment_attempts` table now preserves payment references and allows both return-page verification and webhook processing to resolve the correct attempt.

### 2. Raw server errors could reach the browser

Database and validation details are now replaced with a safe general error message for users while technical details are logged server-side.

### 3. Photo URLs were too permissive

Technician photo URLs are restricted to HTTPS links.

### 4. Booking dates were too loose

Invalid calendar dates are rejected and booking dates are limited to the supported future booking window.

### 5. Technicians could reopen old requests

Technicians can now access only requests currently offered to them or requests they have accepted.

### 6. Repeated actions were not rate limited

Repeated request creation, payment initiation, payment checking, and technician profile saves are now rate limited per user.

---

## Demo Technicians

The demo environment includes verified and available technicians covering multiple Nigerian locations.

| Technician | Services | Coverage | Rating | Jobs |
|---|---|---|---:|---:|
| Zainab Musa | Air Conditioner, Refrigerator | Chikun, Kaduna | 4.9 | 138 |
| Bashir Danjuma | Generator, Washing Machine | Kaduna South, Kaduna | 4.8 | 112 |
| Aisha Suleiman | Air Conditioner, Generator | Municipal Area Council, Abuja | 4.9 | 156 |
| Chinedu Okafor | Laptop, Phone, Television | Gwarinpa, Abuja | 4.7 | 97 |
| Tobi Adeyemi | Refrigerator, Washing Machine, Air Conditioner | Ikeja, Lagos | 4.8 | 143 |
| Ifeoma Nwosu | Laptop, Phone, Television | Yaba, Lagos | 4.9 | 174 |

These are fictional demo technicians created for demonstrating the FixRight workflow.

---

## Example Matching

Examples of the matching behavior:

| Request | Expected Match |
|---|---|
| Air conditioner · Chikun, Kaduna | Zainab Musa |
| Generator · Kaduna South | Bashir Danjuma |
| Laptop · Abuja Municipal | Chinedu Okafor |
| Generator · Abuja Municipal | Aisha Suleiman |
| Phone · Lagos Mainland | Ifeoma Nwosu |
| Refrigerator · Ikeja | Tobi Adeyemi |
| Laptop · Zaria | No eligible technician |

The matching decision is based on service availability, technician verification/availability, and state/LGA coverage.

---

## Architecture

```text
                        ┌───────────────────┐
                        │     Customer      │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │    FixRight UI    │
                        │ React + TypeScript│
                        └─────────┬─────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
        ┌─────────┐         ┌───────────┐        ┌─────────┐
        │  Clerk  │         │   Neon    │        │ Mapbox  │
        │  Auth   │         │PostgreSQL │        │Location │
        └─────────┘         └─────┬─────┘        └─────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Server Actions  │
                         │ Matching/Rules  │
                         └────────┬────────┘
                                  │
                                  ▼
                           ┌────────────┐
                           │  Paystack  │
                           │  Payments  │
                           └────────────┘
```
