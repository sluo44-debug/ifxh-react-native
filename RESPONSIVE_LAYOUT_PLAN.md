# Responsive iPad/iPhone Portrait Layout Plan (Plan Only)

## 0) Current routing (confirmed)
- Runtime entry: `IFXHMobile/App.js` (React Navigation native-stack).
- Live screens: `IFXHMobile/screens/*`.
- Dashboards:
  - BU dashboard: `screens/DashboardScreen.js` (stack name: `Dashboard`)
  - SO dashboard: `screens/SODashboardScreen.js` (stack name: `SODashboard`)
  - Trader dashboard: `screens/TraderDashboardScreen.js` (stack name: `TraderDashboard`)
- Order detail:
  - `screens/OrderDetailScreen.js` (stack name: `OrderDetail`)
- Menu implementation today:
  - `components/AppMenu.js` renders a **Modal** menu with shared menu items + navigation actions.

Goal: keep **portrait everywhere**; implement **responsive layout** with minimal changes and without breaking existing navigation.

---

## 1) Target layouts (portrait only)

### iPad (portrait)
Left menu column + right content area:
- Left: permanent menu column (non-modal), fixed width (e.g. 240)
- Right: list + detail
  - If width is wide enough: **side-by-side** list (left) + detail (right)
  - If width is moderate: **stacked** list (top) + detail (bottom)
  - If no selection: show list full-height + an empty detail placeholder

### iPhone (portrait)
Compact layout:
- Left: slim menu rail (icon/button) (e.g. 56–72 wide). The full menu opens as modal (reuse AppMenu behavior).
- Right: main area split:
  - Upper: list
  - Lower: preview/detail placeholder (optional)
- To preserve navigation flows: tapping an order still navigates to `OrderDetail` as it does today.
  - Preview panel can be phase 2 (optional), to avoid touching business logic.

---

## 2) Proposed responsive shell component

Create a reusable layout wrapper that can be used by BU/SO/Trader dashboard screens.

**New file (planned):**
- `components/layout/ResponsiveShell.js`

**Responsibilities:**
- Decide layout mode using `useWindowDimensions()`:
  - `isTablet = Platform.OS === 'ios' ? Platform.isPad : width >= 900`
  - `tabletWide = width >= 1100` (side-by-side list/detail)
  - `tabletNarrow = isTablet && width < 1100` (stacked list/detail)
  - `phone = !isTablet` (slim menu + split panels)
- Provide 3 slots:
  - `MenuSlot`
  - `ListSlot`
  - `DetailSlot` (or placeholder)

**Slot API (planned):**
```js
<ResponsiveShell
  renderMenu={() => <MenuPanel .../>}
  renderList={() => <OrderList .../>}
  renderDetail={() => <OrderDetailPreview .../>}
/>
```

---

## 3) Menu refactor (minimal + safe)

Right now `components/AppMenu.js` contains both:
- the menu content (items + handlers)
- the modal presentation

To support a permanent left menu on iPad:
- Extract the menu content into a reusable component.

**Planned new files:**
- `components/menu/MenuContent.js` (renders the list of menu items)
- `components/menu/MenuModal.js` (wraps MenuContent in Modal; replaces current AppMenu)
- `components/menu/MenuPanel.js` (permanent left menu column for iPad; uses MenuContent)

**Change (planned):**
- Replace imports of `AppMenu` in dashboards with either:
  - `MenuModal` for phone
  - `MenuPanel` for tablet
  - (ResponsiveShell can handle which one to show.)

---

## 4) Dashboards wiring (keep navigation flows)

We keep the existing screen routes and behavior:
- BU/SO/Trader dashboards remain stack screens.
- Order taps still navigate to `OrderDetail` like today.

**Planned minimal edits:**
- `screens/DashboardScreen.js`
- `screens/SODashboardScreen.js`
- `screens/TraderDashboardScreen.js`

Change pattern:
- wrap current top-level layout in `ResponsiveShell`
- ensure the existing list component area remains intact
- (phase 1) Detail slot can be a placeholder (“Select an order”) on tablet, since the detail screen is still separate.
- (phase 2) optional: embed detail preview by extracting the “detail body” from `OrderDetailScreen` into a reusable component.

---

## 5) Breakpoints + split-view fallback

Use `useWindowDimensions()` (not Dimensions) so it reacts to iPad split view resizing.

Recommended breakpoints (tune after testing):
- `isTablet`: `Platform.isPad || width >= 900`
- `tabletWide`: `width >= 1100`
- `tabletMenuWidth`: 240
- `phoneMenuRailWidth`: 64
- `tabletListMinWidth`: 360
- `tabletDetailMinWidth`: 420

Split-view behavior:
- If iPad in split view becomes narrow (e.g. width < 900), automatically fall back to **phone layout**.

---

## 6) Minimal file-change list (phase 1)

**Add:**
- `components/layout/ResponsiveShell.js`
- `components/menu/MenuContent.js`
- `components/menu/MenuModal.js`
- `components/menu/MenuPanel.js`

**Modify:**
- `components/AppMenu.js` (either replace with re-export, or deprecate and migrate callers)
- `screens/DashboardScreen.js`
- `screens/SODashboardScreen.js`
- `screens/TraderDashboardScreen.js`

**No changes (phase 1):**
- `App.js` routes
- API client, endpoints, business logic
- `OrderDetailScreen.js` (unless doing phase 2 preview)

---

## 7) Test checklist

### A) iPhone portrait (Expo Go)
1. Login as BU/SO/Trader.
2. Open menu (should still work as modal).
3. Verify filters, list refresh, and action buttons unchanged.
4. Tap an order → navigates to `OrderDetail` as before.
5. Back navigation returns to dashboard correctly.

### B) iPad portrait full screen (Expo Go + iPad simulator)
1. Login as BU/SO/Trader.
2. Verify permanent left menu column visible.
3. Verify list area renders correctly.
4. Tap an order:
   - Phase 1: navigates to `OrderDetail` (existing behavior) OR shows placeholder detail (depending on chosen behavior).
5. Verify menu navigation still works.

### C) iPad split view (narrow)
1. Put Expo Go in split view.
2. Confirm responsive fallback:
   - If width < 900: phone-like layout kicks in (menu rail + list).
3. Verify no layout overlap/clipping.

---

## 8) Phase 2 (optional): embedded detail preview
If you want the right panel to actually show details without navigating:
- Extract a pure presentational component from `OrderDetailScreen`:
  - `components/orders/OrderDetailBody.js`
- `OrderDetailScreen` uses it.
- Tablet shell uses it as the right panel preview.
This keeps business logic single-sourced.
