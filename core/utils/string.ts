/**
 * Responsible for capitalizing the first letter of a given string.
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Responsible for converting a string into SCREAMING_SNAKE_CASE.
 */
const NON_ALPHANUM_RX = /[^a-zA-Z0-9_]/g;
const TO_UNDERSCORE_RX = /[-./ ]/g;

export const toScreamingSnakeCase = (str: string): string =>
  str
    .replaceAll(TO_UNDERSCORE_RX, "_")
    .replaceAll(NON_ALPHANUM_RX, "")
    .toUpperCase();

/**
 * Responsible for converting a string into a URL-friendly slug.
 */
export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Responsible for trimming a string to a maximum length.
 * Optionally appends ellipsis if trimmed.
 */
export const trimToLength = (
  str: string,
  maxLength: number,
  ellipsis = true,
): string => {
  if (str.length <= maxLength) return str;
  return ellipsis
    ? str.slice(0, maxLength).trimEnd() + "…"
    : str.slice(0, maxLength);
};

/**
 * Responsible for masking an email address.
 * Example: johndoe@gmail.com -> jo***@gmail.com
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0] ?? ""}***@${domain}`;
  }

  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
};
