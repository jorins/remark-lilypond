/**
 * @module
 * General utilities
 */

import { ExecFileOptions, execFile } from 'node:child_process'

import { FORMAT, MIME_TYPE } from './const'

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

/**
 * Execute file as promise, with stdin support
 */
export async function exec(
  file: string,
  args?: readonly string[],
  options?: ExecFileOptions,
  stdin?: string,
) {
  return new Promise<{
    stdout: string | Buffer
    stderr: string | Buffer
  }>((resolve, reject) => {
    const proc = execFile(file, args, options, (err, stdout, stderr) => {
      if (err) {
        Object.assign(err, { stdout, stderr })
        reject(err)
      }
      resolve({
        stdout,
        stderr,
      })
    })

    if (stdin !== undefined) {
      proc.stdin?.end(stdin, 'utf-8')
    }
  })
}

/**
 * Turns T mutable (removing readonly from attributes)
 */
export type Mutable<T> = T extends
  | Readonly<Record<string | symbol | number, never>>
  | readonly unknown[]
  ? {
      -readonly [key in keyof T]: Mutable<T[key]>
    }
  : T

/**
 * Convert to base64-encoded data URI
 */
export function dataUri(format: (typeof FORMAT)[number], data: Buffer): string {
  return `data:${MIME_TYPE[format]};base64,${data.toString('base64')}`
}
