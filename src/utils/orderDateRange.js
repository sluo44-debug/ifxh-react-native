// Shared date-range filtering for dashboard order lists.
//
// Backend "searchCond" filtering is implemented via stored procedures and can differ
// across roles (BU/SO/Trader). For SO + Trader we fetch "All" from the API and apply
// consistent client-side filtering based on orderDate.

function parseOrderDate(value) {
  if (!value) return null;

  const s = String(value).trim();

  // Common backend format: "yyyy-MM-dd" (sometimes with extra time text).
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (Number.isFinite(yyyy) && Number.isFinite(mm) && Number.isFinite(dd)) {
      // Construct a local date at midnight.
      return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    }
  }

  // Fallback: let JS parse if it can (ISO string, etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function filterOrdersByRange(orders, range) {
  const list = Array.isArray(orders) ? orders : [];
  const r = String(range || "All");

  if (r === "All") return list;

  const today0 = startOfToday();
  const now = new Date();

  const cutoffDays = r === "Today" ? 0 : r === "Weekly" ? 7 : r === "Monthly" ? 30 : null;
  if (cutoffDays == null) return list;

  if (cutoffDays === 0) {
    return list.filter((o) => {
      const d = parseOrderDate(o?.orderDate || o?.date || o?.createdAt || o?.createdOn);
      if (!d) return true; // don't hide orders if we can't parse the date
      return isSameLocalDay(d, today0);
    });
  }

  const cutoffMs = cutoffDays * 24 * 60 * 60 * 1000;
  const cutoffTime = now.getTime() - cutoffMs;

  return list.filter((o) => {
    const d = parseOrderDate(o?.orderDate || o?.date || o?.createdAt || o?.createdOn);
    if (!d) return true; // don't hide orders if we can't parse the date
    // Compare at local midnight for date-only strings.
    return d.getTime() >= cutoffTime;
  });
}
