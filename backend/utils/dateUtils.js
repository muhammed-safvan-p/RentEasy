/**
 * Computes UTC start (00:00:00.000) and end (23:59:59.999) dates for a given YYYY-MM month string.
 * Defaults to the current UTC month if monthStr is not provided or invalid.
 *
 * @param {string} [monthStr] - Optional 'YYYY-MM' formatted string (e.g. '2026-09')
 * @returns {{ start: Date, end: Date }}
 */
function getMonthBoundsUTC(monthStr) {
  if (monthStr && typeof monthStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) {
    const [year, month] = monthStr.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
  }
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

module.exports = {
  getMonthBoundsUTC,
};
