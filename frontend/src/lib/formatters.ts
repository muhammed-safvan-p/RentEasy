/**
 * Centralized formatting and date utility helpers for RentEase
 */

/**
 * Formats a number into Indian Rupee currency (e.g. ₹5,000)
 */
export function formatCurrency(amount: number = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date string into a compact, human-readable date & time (e.g. "Sep 19, 5:00 PM")
 */
export function formatDateTimeNice(dateStr?: string | Date | null): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Formats a date string into full date & time (e.g. "Thu, Sep 19, 2026, 5:00 PM")
 */
export function formatFullDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Formats a date string into a human-readable date only (e.g. "Thu, Sep 19, 2026")
 */
export function formatDateNice(dateStr?: string | Date | null): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a date & time with 2-digit year (e.g. "Mon, Oct 12, '26, 10:00 AM")
 */
export function formatDateTimeShortYear(
  dateStr?: string | Date | null,
  includeWeekday: boolean = true
): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";

  const weekday = includeWeekday
    ? d.toLocaleDateString("en-US", { weekday: "short" }) + ", "
    : "";
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const yearShort = String(d.getFullYear()).slice(-2);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${weekday}${month} ${day}, '${yearShort}, ${time}`;
}

/**
 * Formats a Date object into month display (e.g. "September 2026")
 */
export function formatMonthDisplay(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

/**
 * Formats a Date object into "YYYY-MM" string parameter for backend queries
 */
export function formatMonthParam(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Converts a Date or ISO string to local ISO datetime string for `<input type="datetime-local">`
 */
export function toLocalISOString(dateOrStr?: string | Date | null): string {
  if (!dateOrStr) return "";
  const d = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  if (isNaN(d.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns today's date (or given date) formatted as "YYYY-MM-DD" in local time.
 * Avoids UTC offset day-shift bugs caused by new Date().toISOString().split('T')[0].
 */
export function getLocalTodayDateString(date: Date = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Safely converts a date-only string ("YYYY-MM-DD") or datetime string to an ISO string.
 * For date-only strings, sets time to local noon (12:00:00) so UTC conversion does not
 * shift the calendar date backward or forward in timezones behind or ahead of UTC.
 */
export function toSafeDateISOString(dateStr?: string | Date | null): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? new Date().toISOString() : dateStr.toISOString();
  }

  const str = String(dateStr).trim();
  // If it's a datetime string (contains 'T' or space with time)
  if (str.includes("T") || str.includes(" ")) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // Parse YYYY-MM-DD
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    const localDate = new Date(year, month - 1, day, 12, 0, 0); // Noon local time avoids timezone day-shifting
    return localDate.toISOString();
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

/**
 * Calculates human duration string (e.g. "3d 4h", "2 days", "5 hours")
 */
export function getBookingDurationLabel(startStr: string | Date, endStr: string | Date): string {
  const start = typeof startStr === "string" ? new Date(startStr) : startStr;
  const end = typeof endStr === "string" ? new Date(endStr) : endStr;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0 || isNaN(diffMs)) return "";

  const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  return `${totalHours} hour${totalHours > 1 ? "s" : ""}`;
}

/**
 * Calculates duration in days (minimum 1)
 */
export function getBookingDurationDays(startStr?: string | Date, endStr?: string | Date): number {
  if (!startStr || !endStr) return 1;
  const start = typeof startStr === "string" ? new Date(startStr) : startStr;
  const end = typeof endStr === "string" ? new Date(endStr) : endStr;
  const s = start.getTime();
  const e = end.getTime();
  if (isNaN(s) || isNaN(e)) return 1;
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
}

/**
 * Derives booking lifecycle status ("active" | "upcoming" | "completed" | "cancelled")
 */
export function getBookingStatus(booking: {
  startDateTime: string;
  endDateTime: string;
  isCancelled?: boolean;
}): "active" | "upcoming" | "completed" | "cancelled" {
  if (booking.isCancelled) return "cancelled";
  const now = new Date();
  const start = new Date(booking.startDateTime);
  const end = new Date(booking.endDateTime);

  if (now >= start && now <= end) return "active";
  if (now < start) return "upcoming";
  return "completed";
}
