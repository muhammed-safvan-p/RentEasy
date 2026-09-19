# Comprehensive Frontend Codebase Audit Report: RentEase

**System Under Review:** RentEase Frontend (Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript 5)  
**Backend Architecture:** Node.js / Express / Mongoose / MongoDB  
**Audit Scope:** 100% of frontend files (`frontend/src/` — all pages, screens, routing middleware, layouts, components, utilities, and styling). No sampling.  
**Date:** September 19, 2026

---

## Executive Scorecard & One-Line Justifications

| Dimension | Score / 10 | One-Line Justification |
| :--- | :---: | :--- |
| **1. Correctness / UI Logic** | **5.5 / 10** | Core flows work, but overpayment is blocked or misreported, partial payment drops silently on creation, and the "Edit Booking" flow is completely missing. |
| **2. State Management** | **4.5 / 10** | Local states are isolated with zero cross-screen sync (no store or cache), causing widespread stale metric/balance anomalies across views. |
| **3. API Integration** | **4.0 / 10** | Edge middleware is completely bypassed due to file misnaming (`proxy.ts`), while payments and bookings lack idempotency and double-click guards. |
| **4. Component Architecture** | **4.5 / 10** | Several monolithic "god components" exceed 1,000–1,270 lines with massive code duplication of modals, formatters, and interfaces. |
| **5. Form Handling & Validation** | **6.0 / 10** | Basic required fields are checked, but timezone parsing shifts dates, and imperative validations contradict backend rules on overpayment. |
| **6. UX / Usability** | **7.0 / 10** | Visually polished dark theme and mobile app-shell experience, but marred by SSR flashes and placeholder admin screens. |
| **7. Performance** | **5.5 / 10** | Unpaginated calendar and ledger queries load all historical data into memory, and standard unoptimized `<img>` tags are used. |
| **8. Accessibility (A11y)** | **5.0 / 10** | Custom modal overlays lack keyboard trap, `Escape` handlers, and ARIA roles; icon buttons lack accessible text labels. |
| **9. Code Quality & Structure** | **5.5 / 10** | Divergent duplicate TypeScript interfaces across files, real estate metadata copy-paste artifacts, and confusing route naming (`[id]` vs `[id]/vehicle`). |
| **10. Testing** | **0.5 / 10** | Zero automated tests (unit, integration, or E2E) exist across the entire frontend repository. |

---

## Detailed Dimension-by-Dimension Findings & Code Fixes

---

### 1. Correctness / UI Logic (Score: 5.5 / 10)

#### Issue 1.1: Frontend Actively Blocks Overpayment at Creation Despite Backend Allowing It
- **File:** `frontend/src/app/vehicles/[id]/book/page.tsx:313-316`
- **Problem:** The system requirements explicitly allow overpayment (which yields a negative balance amount). However, the booking form's client validation strictly blocks the operator with an error:
  ```typescript
  if (recordPaymentNow && paidAmount > totalAmount) {
    setErrorMessage("Paid amount cannot exceed the total rental amount.");
    return;
  }
  ```
- **Fix:** Remove the blocking guard. Allow any non-negative `paidAmount` and display the resulting balance or credit clearly:
  ```diff
  - if (recordPaymentNow && paidAmount > totalAmount) {
  -   setErrorMessage("Paid amount cannot exceed the total rental amount.");
  -   return;
  - }
  + if (recordPaymentNow && Number(paidAmount) < 0) {
  +   setErrorMessage("Paid amount cannot be negative.");
  +   return;
  + }
  ```

---

#### Issue 1.2: Clamping Remaining Balance to Zero Conceals Customer Credit
- **File:** `frontend/src/app/vehicles/[id]/book/page.tsx:249-253`
- **Problem:** `Math.max(0, total - paid)` clamps negative balances to 0. If total is ₹1,000 and paid is ₹1,500, the backend tracks `balanceAmount = -500`, but the UI shows `Remaining: ₹0`, hiding the fact that the business owes the customer a credit or refund.
- **Fix:** Allow raw mathematical balance so negative values can be styled as credits:
  ```typescript
  // frontend/src/app/vehicles/[id]/book/page.tsx
  const remainingBalance = useMemo(() => {
    const total = Number(totalAmount) || 0;
    const paid = recordPaymentNow ? Number(paidAmount) || 0 : 0;
    return total - paid; // Allow negative for overpayment credit
  }, [totalAmount, recordPaymentNow, paidAmount]);
  ```

---

#### Issue 1.3: Misleading Overpayment Modal Claims "Total Amount Increases"
- **File:** `frontend/src/app/vehicles/[id]/bookings/page.tsx:323-329` & `lines 1240-1244`
- **Problem:** When recording a part-payment that exceeds the balance, the modal informs the user:
  `"Total increases by +₹X to match total received payment. New Total Rental Amount: ₹Y"`.  
  **In reality**, the backend's `recordPayment` controller does **not** change `totalAmount`. It simply increments `paidAmount` and updates `balanceAmount = totalAmount - paidAmount` (which turns negative). The UI makes a false promise about the backend data model.
- **Fix:** Update the confirmation modal text to accurately reflect the balance model:
  ```tsx
  {/* frontend/src/app/vehicles/[id]/bookings/page.tsx */}
  <p className="text-xs text-slate-300">
    This payment exceeds the remaining balance. Recording this payment will create a credit balance of{" "}
    <strong className="text-emerald-400 font-bold">
      {formatCurrency(overpayConfirmData.excess)}
    </strong>{" "}
    (Balance: -{formatCurrency(overpayConfirmData.excess)}). The total rental amount remains{" "}
    <strong className="text-white">{formatCurrency(selectedBooking.totalAmount)}</strong>.
  </p>
  ```

---

#### Issue 1.4: Complete Absence of the "Edit Booking" Flow
- **File:** `frontend/src/app/vehicles/[id]/bookings/page.tsx`
- **Problem:** The backend provides `PATCH /api/bookings/:id` (supporting updates to `customerName`, `startDateTime`, `endDateTime`, and `totalAmount`). On the frontend, there is **zero UI, modal, or API call** to trigger this endpoint. Operators cannot extend a booking or adjust pricing without directly editing the database.
- **Fix:** Add an `openEditModal(booking)` handler and an "Edit Booking" modal in `bookings/page.tsx` that submits a `PATCH` request to `${baseUrl}/api/bookings/${booking._id}`.

---

#### Issue 1.5: Silent Drop of Failed Advance Payment Creates a "Ghost Booking"
- **File:** `frontend/src/app/vehicles/[id]/book/page.tsx:348-373`
- **Problem:** Booking creation is executed as a two-step sequential client fetch:
  1. `POST /api/bookings`
  2. `POST /api/bookings/${newBooking._id}/payments`
  If Step 2 fails (network glitch, validation error, server 500), the error is **silently ignored** (`if (paymentRes.ok && paymentData.booking)` without an `else` branch). The booking is confirmed with `paidAmount: 0`, and the user is told the booking succeeded with no notice that the payment was not recorded!
- **Fix:** Throw an explicit error or show an immediate warning alert if payment recording fails:
  ```typescript
  if (recordPaymentNow && Number(paidAmount) > 0) {
    const paymentRes = await fetch(`${baseUrl}/api/bookings/${newBooking._id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        amount: Number(paidAmount),
        paymentMethod,
        note: paymentNote.trim() || `Advance payment via ${paymentMethod}`,
      }),
    });

    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) {
      throw new Error(
        `Booking was created (#${newBooking._id.slice(-6)}), but recording payment failed: ${paymentData.message || "Unknown error"}. Please record payment in Bookings tab.`
      );
    }
    finalPaidAmount = paymentData.booking.paidAmount;
    finalBalanceAmount = paymentData.booking.balanceAmount;
  }
  ```

---

### 2. State Management (Score: 4.5 / 10)

#### Issue 2.1: Fragmented Local State & Severe Cross-Screen Stale Data
- **Files:** 
  - `frontend/src/app/dashboard/page.tsx:34-37`
  - `frontend/src/app/vehicles/[id]/page.tsx:67-73`
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx:73-75`
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx:61-66`
- **Problem:** There is no global state manager (Zustand) and no server cache manager (TanStack Query / SWR). State is isolated inside each page component via `useState`.  
  **Scenario:** A user creates a booking on `/vehicles/[id]/book` with a ₹5,000 cash payment. When they navigate back to `/vehicles/[id]` or `/dashboard`, the trip count, current booking status, and wallet balances are **completely stale** because those pages retain old data unless hard-refreshed.
- **Fix:** Introduce SWR or TanStack Query (or a simple React Context / event bus) so that mutating actions automatically invalidate keys like `["vehicle", id]`, `["wallet", id]`, and `["vehicles"]`.

---

#### Issue 2.2: Race Conditions on Rapid Month Switching
- **Files:**
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx:180-210`
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx:190-230`
- **Problem:** Clicking month forward/back chevrons triggers `fetchBookings()` or `fetchTransactions()`. If a user clicks from September to October to November rapidly, the three HTTP requests resolve out-of-order. If October's response finishes after November's, November's UI will be overwritten with October's data.
- **Fix:** Use an `AbortController` in `useEffect` to abort stale in-flight requests:
  ```typescript
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        setListLoading(true);
        const res = await fetch(`${baseUrl}/api/bookings?...`, {
          signal: controller.signal,
          credentials: "include",
        });
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setErrorMessage(err.message);
        }
      } finally {
        setListLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedMonth, id]);
  ```

---

### 3. API Integration (Score: 4.0 / 10)

#### Issue 3.1: Next.js Edge Middleware Completely Non-Functional Due to File Misnaming
- **File:** `frontend/src/proxy.ts:1-40`
- **Problem:** The file is named `src/proxy.ts` and defines `export function proxy(...)`. Next.js **strictly requires** the file to be named `middleware.ts` (or `middleware.js`) placed in the root or `src/`, exporting a function named `middleware`.  
  **Result:** Next.js completely ignores `proxy.ts`. Edge route protection is **100% disabled**. An unauthenticated request to `/dashboard`, `/admin`, or `/vehicles/...` loads the full page HTML and bundles into the browser, relying only on delayed client-side `useEffect` redirects.
- **Fix:** Rename `frontend/src/proxy.ts` to `frontend/src/middleware.ts` and rename the function:
  ```typescript
  // frontend/src/middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';

  export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const protectedPaths = ['/dashboard', '/bookings', '/wallet', '/admin', '/vehicles'];
    const isProtectedPath = protectedPaths.some((path) => 
      request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedPath && !token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const authPaths = ['/login', '/signup'];
    const isAuthPath = authPaths.some((path) => 
      request.nextUrl.pathname.startsWith(path)
    );

    if (isAuthPath && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: [
      '/dashboard/:path*', 
      '/bookings/:path*', 
      '/wallet/:path*', 
      '/admin/:path*',
      '/vehicles/:path*',
      '/login',
      '/signup'
    ],
  };
  ```

---

#### Issue 3.2: Double-Submit Vulnerability on Payment and Booking Forms
- **Files:**
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx:334-382`
  - `frontend/src/app/vehicles/[id]/book/page.tsx:288-320`
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx:391-410`
- **Problem:** If a user double-clicks the "Record Payment" button or presses Enter repeatedly, `executePayment` or `handleAddTransaction` executes concurrently before the first state update (`submitting = true`) renders the disabled state. This results in **duplicate payments being charged to the customer and duplicated in the wallet ledger**.
- **Fix:** Guard against in-flight execution at the function boundary:
  ```typescript
  const executePayment = async (numAmount: number) => {
    if (!selectedBooking || submittingPayment) return; // Prevent double-submit
    setSubmittingPayment(true);
    // ...
  };
  ```

---

#### Issue 3.3: Hardcoded Fallback URL Duplicated in 14+ Separate Files
- **Files:** Present in almost every `.tsx` file under `frontend/src/app/`
- **Problem:** `const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";` is declared locally across 14 different files. There is no centralized API client, interceptor, or standard error mapper.
- **Fix:** Create a centralized API utility (`frontend/src/lib/api.ts`):
  ```typescript
  // frontend/src/lib/api.ts
  export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return res.json();
  }
  ```

---

### 4. Component Architecture (Score: 4.5 / 10)

#### Issue 4.1: Massive Monolithic Files ("God Components")
- **Files:**
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx` — **1,271 lines**
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx` — **1,180 lines**
  - `frontend/src/app/vehicles/[id]/book/page.tsx` — **1,025 lines**
- **Problem:** `bookings/page.tsx` houses booking list filtering, month pagination, part-payment modal, overpayment warning modal, cancellation modal with refund logic, and transaction timelines all inside one single React component. This causes huge bundle sizes, cognitive overload, and high regression risk.
- **Fix:** Decompose into distinct, testable subcomponents:
  - `components/bookings/BookingCard.tsx`
  - `components/bookings/PaymentModal.tsx`
  - `components/bookings/CancelModal.tsx`
  - `components/bookings/EditBookingModal.tsx`

---

#### Issue 4.2: Extensive Copy-Paste Duplication Across Screens
- **Files:** `dashboard/page.tsx`, `vehicles/[id]/page.tsx`, `bookings/page.tsx`, `wallet/page.tsx`, `book/page.tsx`
- **Problem:** Functions like `formatCurrency`, `formatDateTimeNice`, and UI elements like modal backdrops, metric summary cards, and error banners are copy-pasted in each file with slight deviations in formatting.
- **Fix:** Extract shared utilities into `frontend/src/lib/formatters.ts`:
  ```typescript
  // frontend/src/lib/formatters.ts
  export const formatCurrency = (amount: number = 0): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  export const formatDateTimeNice = (dateStr: string): string => {
    if (!dateStr) return "";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateStr));
  };
  ```

---

### 5. Form Handling & Validation (Score: 6.0 / 10)

#### Issue 5.1: Naive `toISOString()` Converts Local Date Input into Mismatched UTC
- **Files:**
  - `frontend/src/app/vehicles/[id]/book/page.tsx:330-331`
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx:420`
- **Problem:** `<input type="datetime-local">` produces strings in local time (`"2026-09-19T09:00"`). When passing this to `new Date("2026-09-19").toISOString()` in `wallet/page.tsx:420`, JavaScript interprets date-only strings as UTC midnight (`2026-09-19T00:00:00.000Z`). In timezones behind UTC (such as US timezones), this displays as the **previous calendar day** (`2026-09-18`), shifting recorded transactions into the wrong day.
- **Fix:** Always preserve explicit local midnight when converting date-only strings:
  ```typescript
  // frontend/src/app/vehicles/[id]/wallet/page.tsx:420
  const [year, month, day] = formDate.split("-").map(Number);
  const localDate = new Date(year, month - 1, day, 12, 0, 0); // Noon local time avoids day-shifting
  const isoDate = localDate.toISOString();
  ```

---

#### Issue 5.2: Missing Input Guards on Custom Override Total Amount
- **File:** `frontend/src/app/vehicles/[id]/book/page.tsx:231` & `line 308`
- **Problem:** If a user checks "Override total amount" and types a non-numeric string or leaves it blank, `customTotalAmount` evaluates to `NaN` or `null`. While `totalAmount < 0` is checked, `isNaN(totalAmount)` is not strictly validated, sending `null` or `NaN` to the backend.
- **Fix:** Enforce explicit numeric validation:
  ```typescript
  const numericTotal = Number(totalAmount);
  if (isNaN(numericTotal) || numericTotal < 0) {
    setErrorMessage("Please enter a valid rental amount (greater than or equal to 0).");
    return;
  }
  ```

---

### 6. UX / Usability (Score: 7.0 / 10)

#### Issue 6.1: Hydration Workaround Causes Full White Flash in Admin Layout
- **File:** `frontend/src/app/admin/layout.tsx:37`
- **Problem:** `if (!isClient) return null;` is used to dodge hydration mismatches. This forces Next.js to deliver a completely empty blank page on server-side rendering, causing a jarring flash of white content before client JavaScript mounts.
- **Fix:** Remove `if (!isClient) return null;`. Clean up the hydration mismatch at its source (use deterministic rendering or CSS-based visibility toggling).

---

#### Issue 6.2: Admin Dashboard Contains Unimplemented Placeholder Content
- **File:** `frontend/src/app/admin/dashboard/page.tsx:37-42`
- **Problem:** When an admin logs into `/admin/dashboard`, they see a static developer note:
  > *"This is the admin panel foundation. The other sections (Users, Vehicles, Bookings, Payments) will be built out soon."*  
  There are no KPIs, revenue metrics, active fleet counts, or quick actions.
- **Fix:** Replace the placeholder box with summary metric widgets (Total Vehicles, Active Bookings, Monthly System Revenue, Blocked Users).

---

### 7. Performance (Score: 5.5 / 10)

#### Issue 7.1: Unbounded and Unpaginated Queries on Calendar and Booking History
- **Files:**
  - `frontend/src/app/vehicles/[id]/book/page.tsx:142`
  - `frontend/src/app/admin/vehicles/[id]/page.tsx:65`
- **Problem:** `fetch(${baseUrl}/api/vehicles/${id}/calendar)` is called with **no `from` or `to` parameters**. In the backend (`bookingService.js:490`), omitting `from`/`to` causes MongoDB to return **every single booking in vehicle history**. As the platform grows to hundreds of bookings per vehicle, this payload balloons into megabytes.
- **Fix:** Pass a bounded date window (e.g., current month ± 1 month) to the calendar query:
  ```typescript
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
  fetch(`${baseUrl}/api/vehicles/${id}/calendar?from=${from}&to=${to}`, { credentials: "include" });
  ```

---

#### Issue 7.2: Unoptimized Standard `<img>` Elements
- **Files:**
  - `frontend/src/app/vehicles/[id]/book/page.tsx:554`
  - `frontend/src/app/vehicles/[id]/vehicle/page.tsx:210`
- **Problem:** Raw HTML `<img>` tags are used for vehicle banners without responsive `sizes`, WebP/AVIF format optimization, lazy loading, or layout shift prevention.
- **Fix:** Replace with `next/image`:
  ```tsx
  import Image from "next/image";

  <Image
    src={vehicle.imageUrl}
    alt={vehicle.name}
    width={400}
    height={240}
    className="w-full h-44 object-cover rounded-2xl"
    priority={false}
  />
  ```

---

### 8. Accessibility (Score: 5.0 / 10)

#### Issue 8.1: Missing Modal Dialog Semantics, Focus Trapping, and Escape Listeners
- **Files:**
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx:880-1260`
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx:900-1170`
- **Problem:** The payment, cancellation, and transaction modals are rendered as simple `<div>` overlays without `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`. Keyboard focus is not trapped inside the modal, and pressing the `Escape` key does not dismiss the modal.
- **Fix:** Wrap modals with accessible attributes and an `Escape` keyboard listener:
  ```tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center ..."
    >
  ```

---

#### Issue 8.2: Icon-Only Navigation Buttons Lack Accessible Text
- **Files:**
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx:150-165`
  - `frontend/src/app/vehicles/[id]/wallet/page.tsx:160-175`
- **Problem:** Month pagination buttons `<button onClick={handlePrevMonth}><ChevronLeft /></button>` have no text or `aria-label`. Screen reader users hear only "button".
- **Fix:** Add descriptive `aria-label` attributes:
  ```tsx
  <button onClick={handlePrevMonth} aria-label="Previous month" className="...">
    <ChevronLeft className="w-4 h-4" />
  </button>
  ```

---

### 9. Code Quality & Structure (Score: 5.5 / 10)

#### Issue 9.1: Inconsistent & Divergent Local TypeScript Interfaces
- **Files:**
  - `frontend/src/app/vehicles/[id]/page.tsx:47-61`
  - `frontend/src/app/vehicles/[id]/bookings/page.tsx:48-65`
- **Problem:** Interface `Booking` is declared independently in multiple files with divergent properties. In `vehicles/[id]/page.tsx`, it includes obsolete legacy fields like `startDate?`, `endDate?`, `isPaid?`, and `paid?` that no longer exist in the backend schema.
- **Fix:** Consolidate data models into `frontend/src/types/index.ts`:
  ```typescript
  // frontend/src/types/index.ts
  export interface Booking {
    _id: string;
    vehicleId: string | { _id: string; name: string; plateNumber: string };
    customerName: string;
    startDateTime: string;
    endDateTime: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    refundedAmount?: number;
    isCancelled: boolean;
    cancelledAt?: string;
    cancellationNote?: string;
    createdBy?: {
      _id: string;
      username: string;
    };
  }
  ```

---

#### Issue 9.2: Copy-Paste Metadata Bug in Root Layout
- **File:** `frontend/src/app/layout.tsx:11-15`
- **Problem:** The application is a vehicle rental system for cars and bikes. The metadata description reads:
  ```typescript
  export const metadata: Metadata = {
    title: "RentEasy",
    description: "Premium Real Estate Renting Companion.",
    manifest: "/manifest.json",
  };
  ```
- **Fix:**
  ```diff
  - description: "Premium Real Estate Renting Companion.",
  + description: "Vehicle rental booking and fleet management system.",
  ```

---

#### Issue 9.3: Confusing Route Architecture (`/vehicles/[id]` vs `/vehicles/[id]/vehicle`)
- **Files:** `frontend/src/app/vehicles/[id]/page.tsx` vs `frontend/src/app/vehicles/[id]/vehicle/page.tsx`
- **Problem:** Route `/vehicles/[id]` is the vehicle's dashboard/garage screen. Route `/vehicles/[id]/vehicle` is the vehicle's specification & operational notes profile. This naming creates confusion in navigation links and URL semantics.
- **Fix:** Rename `/vehicles/[id]/vehicle` to `/vehicles/[id]/specs` or `/vehicles/[id]/profile`.

---

### 10. Testing (Score: 0.5 / 10)

#### Issue 10.1: Complete Absence of Test Coverage
- **File:** `frontend/package.json`
- **Problem:** There is not a single test file in the entire repository. `package.json` contains no test runner (`vitest`, `jest`, or `playwright`).
- **Critical Unprotected Flows:**
  1. Booking date overlap detection logic.
  2. Advance/part/overpayment balance calculation.
  3. Cancellation refund boundary constraints.
  4. Authentication route guard redirects.
- **Fix:** Install Vitest and React Testing Library:
  ```bash
  npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
  ```
  Add unit tests for calculation utilities in `src/lib/__tests__/bookingMath.test.ts`.

---

## Overall Weighted Score Calculation

Rather than a raw average (which obscures the severity of security, data integrity, and architectural issues), the dimensions are weighted according to operational impact and business risk:

| Dimension | Weight | Raw Score (/10) | Weighted Points (/100) |
| :--- | :---: | :---: | :---: |
| **1. Correctness / UI Logic** | 20% | 5.5 | **11.0** |
| **2. State Management** | 15% | 4.5 | **6.75** |
| **3. API Integration** | 15% | 4.0 | **6.0** |
| **4. Component Architecture** | 10% | 4.5 | **4.5** |
| **5. Form Handling & Validation** | 10% | 6.0 | **6.0** |
| **6. UX / Usability** | 10% | 7.0 | **7.0** |
| **7. Performance** | 5% | 5.5 | **2.75** |
| **8. Accessibility** | 5% | 5.0 | **2.5** |
| **9. Code Quality & Structure** | 5% | 5.5 | **2.75** |
| **10. Testing** | 5% | 0.5 | **0.25** |
| **Total** | **100%** | — | **49.5 / 100** |

### **Overall Score: 50 / 100**

> **Weighting Reasoning:**
> In a vehicle rental system managing reservations and cash/bank balances, **Correctness & UI Logic (20%)**, **API Integration (15%)**, and **State Management (15%)** carry half the total weight because failures directly produce double bookings, phantom payments, or miscalculated balances. Design and styling are visually impressive (7/10), but architectural debt and zero test coverage pull the system's production readiness down to a 50/100.

---

## Prioritized Top 5 Issues to Fix First (Ranked by Risk & Impact)

```
RANK 1: Edge Middleware Misnaming (`proxy.ts` -> `middleware.ts`)
  Impact: HIGH SECURITY RISK — Edge auth protection is currently 100% inactive.

RANK 2: Double-Submit Vulnerability on Payments & Booking Creation
  Impact: HIGH FINANCIAL RISK — Concurrent clicks record duplicate payments in the wallet ledger.

RANK 3: Overpayment UI Contradictions & Balance Clamping
  Impact: HIGH BUSINESS LOGIC RISK — Blocks allowed advance overpayments and misinforms operators.

RANK 4: Complete Absence of the "Edit Booking" Flow
  Impact: HIGH OPERATIONAL GAP — Operators cannot extend bookings or alter total amounts.

RANK 5: Silent Drop of Failed Advance Payments on Booking Creation
  Impact: DATA INTEGRITY RISK — Creates bookings with 0 paid amount while telling user payment succeeded.
```

1. **Fix `src/proxy.ts` -> `src/middleware.ts` (Priority 1):**  
   *Risk:* Security bypass. Unauthenticated users load protected page bundles and trigger avoidable 401 API cascades. Fix takes less than 2 minutes by renaming the file and function.
2. **Add In-Flight Locks to Payment & Booking Submissions (Priority 2):**  
   *Risk:* Financial ledger duplication. Prevent multiple clicks on `executePayment` and `handleConfirmBooking` by checking in-flight state at the function top.
3. **Align Overpayment Logic with Backend Data Model (Priority 3):**  
   *Risk:* Operator confusion and blocked customers. Unblock `paidAmount > totalAmount` in `book/page.tsx`, stop clamping balance with `Math.max(0, ...)`, and correct the modal message to state that overpayments create credit balances.
4. **Implement the "Edit Booking" Flow (Priority 4):**  
   *Risk:* Missing core feature. Operators cannot extend rentals or correct customer names without calling the backend manually.
5. **Handle Partial Failure in Multi-Step Booking Creation (Priority 5):**  
   *Risk:* Discrepancy between customer cash handed over and system records. If the advance payment POST fails after the booking POST succeeds, surface an immediate warning with the created booking ID.
