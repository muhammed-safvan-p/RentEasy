/**
 * Currency and Monetary Utilities
 *
 * Prevents IEEE-754 floating-point precision drift (e.g. 1249.9999999999998)
 * by safely rounding values to 2 decimal places using Number.EPSILON.
 */

/**
 * Safely rounds any number or numeric string to 2 decimal places.
 * Returns 0 for null, undefined, or NaN inputs.
 *
 * @param {number|string} num
 * @returns {number}
 */
function roundCurrency(num) {
  if (num === null || num === undefined || isNaN(num) || num === '') {
    return 0;
  }
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  roundCurrency,
};
