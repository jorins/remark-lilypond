/**
 * @module
 * Library for invoking lilypond
 */

import * as childProcess from 'node:child_process'
import os from 'os'

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { wrapMusic, computeArgs, validateOptions } from './lilypondUtil'
import { fromEntries } from './util'

/**
 * The format of the (main) output file or files. Possible values for format are ps, pdf, png or svg.
 *
 * SVG internally uses a specific backend, and therefore cannot be obtained in the same run as other formats; using -fsvg or --svg is actually equivalent to using the -dbackend=svg option. See Advanced command line options for LilyPond.
 *
 * @see {@link https://lilypond.org/doc/v2.24/Documentation/usage/command_002dline-usage#basic-command-line-options-for-lilypond | Lilypond Docs}
 */
export const outputFormats = ['ps', 'pdf', 'png', 'svg'] as const
/**
 * The format of the (main) output file or files. Possible values for format are ps, pdf, png or svg.
 *
 * SVG internally uses a specific backend, and therefore cannot be obtained in the same run as other formats; using -fsvg or --svg is actually equivalent to using the -dbackend=svg option. See Advanced command line options for LilyPond.
 *
 * @see {@link https://lilypond.org/doc/v2.24/Documentation/usage/command_002dline-usage#basic-command-line-options-for-lilypond | Lilypond Docs}
 */
export type OutputFormat = (typeof outputFormats)[number]

export const USE_ENV = Symbol('USE_ENV')

/**
 * Lilypond opts with all options set. For internal use.
 */
export type StrictLilypondOpts = {
  /**
   * Lilypond binary to invoke
   *
   * Default to {@link USE_ENV} for POSIX systems, and `lilypond.exe` on Windows systems.
   *
   * @default `lilypond.exe` | USE_ENV
   */
  readonly binary: string | typeof USE_ENV

  /**
   * Lilypond document version to use. This value will be written to the
   * `\\version` at the top of the score if `wrap` is true.
   *
   * @default 2.24
   */
  readonly version: string

  /**
   * List of formats to render. `svg` cannot be used along with other formats,
   * and `ps` and `eps` are not presently supported.
   *
   * @default ['pdf']
   */
  readonly formats: readonly Exclude<OutputFormat, 'svg'>[] | readonly ['svg']

  /**
   * Whether to crop the output.
   *
   * @default false
   */
  readonly crop: boolean

  /**
   * DPI of `png` output. If `null`, let Lilypond determine the default (101 as
   * of writing).
   *
   * @default null
   */
  readonly dpi: number | null

  /**
   * Whether to add a `\midi` block to the score if `wrap` is set.
   *
   * @default false
   */
  readonly midi: boolean

  /**
   * Whether to automatically wrap music expressions in a complete score.
   * If `true`, the input is automatically added to the template
   *
   * ```lilypond
   * \version ${version}
   * \score {
   *   { ${input} }
   *   \layout { }
   *   \midi { }
   * }
   * ```
   *
   * If `false`, your input has to be a complete score. This means that you need
   * to manually enter a version and make sure that your desired output files
   * are properly created. See [Lilypond
   * docs](https://lilypond.org/doc/v2.24/Documentation/notation/the-midi-block)
   *
   * @default true
   */
  readonly wrap: boolean
}

type Mutable<T> = T extends
  | Readonly<Record<string | symbol | number, never>>
  | readonly unknown[]
  ? {
      -readonly [key in keyof T]: Mutable<T[key]>
    }
  : T

/**
 * Options for invoking lilypond. For external use.
 */
export type LilypondOpts = {
  -readonly [key in keyof StrictLilypondOpts]?: Mutable<StrictLilypondOpts[key]>
}

/**
 * The output files of a lilypond invocation, as a record of filetypes and
 * buffers in addition to the CLI's stdout and stderr.
 */
export type LilypondResults = {
  stdout: string
  stderr: string
  outputs: Partial<Record<OutputFormat | `cropped.${OutputFormat}`, Buffer>>
  midi?: Buffer
}

/**
 * Default Lilypond options.
 *
 * These choices intend to reflect 'standard' lilypond usage. Some will be
 * overridden by the plugin options.
 */
const defaults: StrictLilypondOpts = {
  binary: process.platform === 'win32' ? 'lilypond.exe' : USE_ENV,
  version: '2.22.1',
  formats: ['pdf'],
  crop: false,
  dpi: null,
  midi: false,
  wrap: false,
}

/**
 * Invoke lilypond.
 *
 * @return The resulting outputs
 */
export async function invokeLilypond<
  Formats extends Readonly<StrictLilypondOpts['formats']>,
>(
  music: string,
  opts?: LilypondOpts & { formats: Formats },
): Promise<
  LilypondResults & {
    outputs: Record<Formats[number], Buffer>
  }
>
export async function invokeLilypond(
  music: string,
  opts?: LilypondOpts,
): Promise<LilypondResults>
export async function invokeLilypond(
  music: string,
  opts?: LilypondOpts,
): Promise<LilypondResults> {
  const fullOpts: unknown = {
    ...defaults,
    ...(opts ?? {}),
  }

  validateOptions(fullOpts)

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lilypond-'))
  try {
    const args: readonly string[] =
      fullOpts.binary === USE_ENV
        ? ['lilypond', ...computeArgs(fullOpts, path.join(tempDir, 'output'))]
        : computeArgs(fullOpts, path.join(tempDir, 'output'))
    const { stdout, stderr } = await new Promise<{
      stdout: string
      stderr: string
    }>((resolve, reject) => {
      const cp = childProcess.execFile(
        fullOpts.binary === USE_ENV ? '/usr/bin/env' : fullOpts.binary,
        args,
        {},
        (err, stdout, stderr) => {
          if (err) {
            Object.assign(err, { stdout, stderr })
            reject(err)
          }
          resolve({
            stdout,
            stderr,
          })
        },
      )
      cp.stdin?.end(
        fullOpts.wrap === true ? wrapMusic(music, fullOpts) : music,
        'utf-8',
      )
    })

    const outputs = await Promise.all(
      fullOpts.formats.map(async type => {
        return [
          type,
          await readFile(path.join(tempDir, `output.${type}`)),
        ] as const
      }),
    ).then(entries => fromEntries(entries))

    return {
      stdout,
      stderr,
      outputs,
      ...(fullOpts.midi
        ? { midi: await readFile(path.join(tempDir, 'output.midi')) }
        : null),
    }
  } finally {
    // Sanity check for tempDir
    // so we don't accidentally recursively delete root...
    if (tempDir.length > 6) {
      await rm(tempDir, {
        recursive: true,
      })
    }
  }
}
