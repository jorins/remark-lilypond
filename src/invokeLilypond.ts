/**
 * @module
 * Library for invoking LilyPond
 */

import type { Mutable } from './util'

import os from 'node:os'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { wrapMusic, computeArgs, validateOptions } from './lilypondUtil'
import { fromEntries, exec } from './util'
import {
  FORMAT,
  USE_ENV_BINARY,
  ENV_PATH,
  WIN32_DEFAULT_PATH,
  FILENAME,
} from './const'

/**
 * The format of the (main) output file or files. Possible values for format
 * are pdf, png or svg.
 *
 * SVG internally uses a specific backend, and therefore cannot be obtained in
 * the same run as other formats; using -fsvg or --svg is actually equivalent
 * to using the -dbackend=svg option. See Advanced command line options for
 * LilyPond.
 *
 * @see {@link https://lilypond.org/doc/v2.24/Documentation/usage/command_002dline-usage#basic-command-line-options-for-lilypond | LilyPond Docs: Basic command linke options for LilyPond}
 */
export const outputFormats = ['pdf', 'png', 'svg'] as const satisfies Array<
  (typeof FORMAT)[number]
>

/**
 * The format of the (main) output file or files. Possible values for format
 * are pdf, png or svg.
 *
 * SVG internally uses a specific backend, and therefore cannot be obtained in
 * the same run as other formats; using -fsvg or --svg is actually equivalent
 * to using the -dbackend=svg option. See Advanced command line options for
 * LilyPond.
 *
 * @see {@link https://lilypond.org/doc/v2.24/Documentation/usage/command_002dline-usage#basic-command-line-options-for-lilypond | LilyPond docs: Basic command linke options for LilyPond}
 */
export type OutputFormat = (typeof outputFormats)[number]

/**
 * Acceptable format combinations
 */
type FormatCombination =
  | Readonly<Exclude<OutputFormat, 'svg'>[]>
  | readonly ['svg']

/**
 * LilyPond opts with all options set. For internal use.
 */
export type StrictLilypondOpts = {
  /**
   * LilyPond binary to invoke
   *
   * Default to {@link USE_ENV} for POSIX systems, and `lilypond.exe` on
   * Windows systems.
   *
   * @default `lilypond.exe` | USE_ENV
   */
  readonly binary: string | typeof USE_ENV_BINARY

  /**
   * LilyPond document version to use. This value will be written to the
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
  readonly formats: FormatCombination

  /**
   * Whether to crop the output.
   *
   * @default false
   */
  readonly crop: boolean

  /**
   * DPI of `png` output. If `null`, let LilyPond determine the default (101 as
   * of writing).
   *
   * @default null
   */
  readonly dpi: number | null

  /**
   * Whether to grab MIDI output from the run and add a `\midi` block to the
   * score if `wrap` is set. Must be true to access MIDI output even if `wrap`
   * is false.
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
   * are properly created.
   *
   * @see {@link https://lilypond.org/doc/v2.24/Documentation/notation/the-midi-block | LilyPond docs: The MIDI block}
   *
   * @default true
   */
  readonly wrap: boolean
}

/**
 * Options for invoking LilyPond. For external use.
 */
export type LilypondOpts = {
  -readonly [key in keyof StrictLilypondOpts]?: Mutable<StrictLilypondOpts[key]>
}

/**
 * The output files of a LilyPond invocation, as a record of filetypes and
 * buffers in addition to the CLI's stdout and stderr.
 */
export type LilypondResults<Formats extends FormatCombination> = {
  stdout: string
  stderr: string
  outputs: Record<Formats[number], Buffer>
  midi?: Buffer
}

/**
 * Default LilyPond options.
 *
 * These choices intend to reflect 'standard' LilyPond usage. Some will be
 * overridden by the plugin options.
 */
const defaults: StrictLilypondOpts = {
  binary: process.platform === 'win32' ? WIN32_DEFAULT_PATH : USE_ENV_BINARY,
  version: '2.22',
  formats: ['pdf'],
  crop: false,
  dpi: null,
  midi: false,
  wrap: false,
}

/**
 * Invoke LilyPond.
 *
 * @return The resulting outputs
 */
export async function invokeLilypond<
  Formats extends Readonly<StrictLilypondOpts['formats']>,
>(
  music: string,
  opts?: LilypondOpts & { formats: Formats },
): Promise<LilypondResults<Formats>> {
  const fullOpts = {
    ...defaults,
    ...(opts ?? {}),
  }

  validateOptions(fullOpts)

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lilypond-'))

  function filePath(...postfix: Array<string | null | undefined>): string {
    return path.join(
      tempDir,
      [FILENAME, ...postfix].filter(i => Boolean(i)).join('.'),
    )
  }

  try {
    const [binary, envArgs] =
      fullOpts.binary === USE_ENV_BINARY
        ? [ENV_PATH, ['lilypond']]
        : [fullOpts.binary, []]

    const args: readonly string[] = [
      ...envArgs,
      ...computeArgs(fullOpts, filePath()),
    ]

    const score = fullOpts.wrap === true ? wrapMusic(music, fullOpts) : music

    const { stdout, stderr } = await exec(binary, args, undefined, score)

    const outputs = Promise.all(
      fullOpts.formats.map(async type => {
        return [
          type,
          await readFile(filePath(fullOpts.crop ? 'cropped' : null, type)),
        ] as const
      }),
    ).then(entries => fromEntries(entries))

    const midi = fullOpts.midi === true ? readFile(filePath('midi')) : undefined

    return {
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      outputs: await outputs,
      midi: await midi,
    }
  } finally {
    // Make sure that tempDir doesn't point to root
    if (tempDir.length > 6) {
      await rm(tempDir, {
        recursive: true,
      })
    }
  }
}
