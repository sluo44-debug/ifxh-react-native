# IFXH Mobile — Manual Test Checklist (BU → Pitching SO → Trader → Catching SO Pair)

Scope: **BU creates order → Pitching SO approves → Trader Approve(OVN) selects Catching SO → Catching SO Pair (In Progress)**

Statuses (from Project GUI):
- **Pending** = `1`
- **Approved (Pitching SO)** = `11`
- **Open (Trader Approve(OVN) + assigns Catching SO)** = `5`
- **In Progress (Catching SO Pair)** = `7`

Client-side safety rule (matches Web):
- Approve/Pair screens require **Confirm checkbox** to be checked before enabling submit.

---

## 0) Pre-flight (once)

1. Backend: ensure the new API endpoints are deployed (Controllers build OK).
2. Mobile: ensure dependencies installed:
   - `npm install` (and `npm install axios` if missing)
3. Start mobile with clean cache:
   - `npx expo start -c`
4. Enable debug logs (optional, if you want logs even outside __DEV__):
   - set `EXPO_PUBLIC_DEBUG_LOGS=1` in your environment

Expected logs prefix: `"[IFXH][YYYY-MM-DD ...]"`

---

## 1) BU step — Create Order (Pending)

**Actor:** BU (example: `BU2@test.ca`)

1. Login as BU.
2. Go to **Create Order**.
3. Select **Recipient BU** (example: BU3 / China).
4. Enter **Amount** (> 0).
5. Enter **Purpose** (if shown).
6. Tap **Save / Submit**.

**Expected result:**
- Order created with status **Pending** (`1`).
- In BU dashboard:
  - Appears in **Sent** list with status Pending.

**Expected logs:**
- API call for create order (POST `/api/orders`)
- Refresh trigger on BU dashboard after returning.

---

## 2) Pitching SO step — Approve (Approved=11)

**Actor:** Pitching SO (example: `SO2@test.ca`)

1. Login as SO2.
2. Open **SO Dashboard → Received** list (or the list that shows Pending).
3. Find the new order (status Pending).
4. Open Order Detail / Approve screen.
5. Tick the **Confirm** checkbox.
6. Tap **Approve**.

**Expected result:**
- Order status becomes **Approved** (`11`).
- Order should no longer show "Approve" action for SO.
- Order should move out of the SO list that shows Pending.

**Expected logs:**
- API call `POST /api/orders/{id}/approve/pitching-so`
- `STATUS SOApprove` transition log (from `1` to `11`)
- Refresh trigger in SO dashboard after returning.

---

## 3) Trader step — Approve(OVN) + select Catching SO (Open=5)

**Actor:** Trader (example: `trader1@test.ca`)

1. Login as Trader.
2. Open **Trader Dashboard** and find the order with status **Approved (11)**.
3. Open **Approve(OVN)** screen.
4. Verify the screen shows:
   - order id/date
   - sender/recipient companies
   - amount, rate, purpose (if present)
   - status
5. In **Receive SO dropdown/list**, select the **Catching SO** (example: SO3).
6. Tick the **Confirm** checkbox.
7. Tap **Approve(OVN)**.

**Expected result:**
- Order status becomes **Open** (`5`).
- Order disappears from Trader list (since trader action is done for this step).
- Catching SO should now see the order available for pairing.

**Expected logs:**
- API call `GET /api/so/recipient-options?...`
- API call `POST /api/orders/{id}/approve/trader`
- `STATUS TraderApproveOVN` transition log (from `11` to `5`)
- Refresh trigger in Trader dashboard after returning.

---

## 4) Catching SO step — Pair (In Progress=7)

**Actor:** Catching SO (example: `SO3@test.ca`)

1. Login as SO3.
2. Open **SO Dashboard → Received**.
3. Find the order with status **Open (5)** and action **Pair** visible.
4. Open **Pair** screen.
5. Tick **Confirm** checkbox (“confirm full paired”).
6. Tap **Pair**.

**Expected result:**
- Order status becomes **In Progress** (`7`).
- Order should disappear from the SO3 list that shows Open/Pending actions.
- (Depending on later flow) it may move into a different list/tab.

**Expected logs:**
- API call `POST /api/orders/{id}/pair/catching-so`
- `STATUS SOPair` transition log (from `5` to `7`)
- Refresh trigger in SO dashboard after returning.

---

## 5) Final cross-check (lists)

After step 4:
- BU Sent list should show the order with updated status (if your BU list includes it).
- SO2 should not be able to approve again.
- Trader should not see the order in the Approve(OVN) queue.
- SO3 should not see Pair action once status is `7`.

If any action button appears when it shouldn’t, confirm:
- role matches (BU / SO / Trader)
- `latestStatusId` returned by `GET /api/orders/{id}` matches expected code
- debug logs show the list refresh executed after returning to dashboard

