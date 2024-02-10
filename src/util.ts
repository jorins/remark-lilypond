/**
 * @module
 * General utilities
 */

/**
 * Construct a multiline string from args. Filters out null and undefined.
 */
export function multiline(...args: Array<string | null | undefined>): string {
  return args.filter(arg => arg !== null && arg !== undefined).join('\n')
}

/**
 * Better typed fromEntries
 * https://stackoverflow.com/a/76176570/19896932
 */
export function fromEntries<
  const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
>(entries: T): { [K in T[number] as K[0]]: K[1] } {
  return Object.fromEntries(entries) as { [K in T[number] as K[0]]: K[1] }
}
