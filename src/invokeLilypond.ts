/**
 * @module
 * Library for invoking lilypond
 */

import * as childProcess from 'node:child_process'
import * as os from 'node:os'

import { writeFile, mkdtemp } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { wrapMusic, computeArgs, validateOptions } from './lilypondUtil'
import { fromEntries } from './util'

const exec = promisify(childProcess.exec)

/**
 * Lilypond's possible output formats, as per
 * [documentation](https://lilypond.org/doc/v2.24/Documentation/notation/alternative-output-formats)
 *
 * `ps` and `eps` are not supported.
 */
export type OutputFormat = 'eps' | 'pdf' | 'png' | 'ps' | 'svg'

/**
 * Lilypond opts with all options set. For internal use.
 */
export type StrictLilypondOpts = {
  /**
   * Lilypond binary to invoke
   *
   * @default `lilypond.exe` for Windows; otherwise `/usr/bin/env lilypond`
   */
  binary: string

  /**
   * Lilypond document version to use. This value will be written to the
   * `\\version` at the top of the score if `wrap` is true.
   *
   * @default 2.24
   */
  version: string

  /**
   * List of formats to render. `svg` cannot be used along with other formats,
   * and `ps` and `eps` are not presently supported.
   *
   * @default ['pdf']
   */
  formats: OutputFormat[]

  /**
   * Whether to crop the output.
   *
   * @default false
   */
  crop: boolean

  /**
   * DPI of `png` output. If `null`, let Lilypond determine the default (101 as
   * of writing).
   *
   * @default null
   */
  dpi: number | null

  /**
   * Whether to add a `\midi` block to the score if `wrap` is set.
   *
   * @default false
   */
  midi: boolean

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
  wrap: boolean
}

/**
 * Options for invoking lilypond. For external use.
 */
export type LilypondOpts = Partial<StrictLilypondOpts>

/**
 * The output files of a lilypond invocation, as a record of filetypes and
 * buffers in addition to the CLI's stdout and stderr.
 */
export type LilypondResults = {
  stdout: string
  stderr: string
  outputs: Partial<Record<OutputFormat, Buffer>>
  midi?: Buffer
}

/**
 * Default Lilypond options.
 *
 * These choices intend to reflect 'standard' lilypond usage. Some will be
 * overridden by the plugin options.
 */
const defaults: StrictLilypondOpts = {
  binary: os.type() === 'Windows_NT' ? 'lilypond.exe' : '/usr/bin/env lilypond',
  version: '2.24',
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
export async function invokeLilypond(
  music: string,
  opts?: LilypondOpts,
): Promise<LilypondResults> {
  const fullOpts = {
    ...defaults,
    ...(opts ?? {}),
  }

  validateOptions(fullOpts)

  const score = fullOpts.wrap === true ? wrapMusic(music, fullOpts) : music

  const tempDir = await mkdtemp(join(os.tmpdir(), 'lilypond-'))
  const inputPath = join(tempDir, 'score.ly')
  await writeFile(inputPath, score)

  const commandLine = computeArgs(fullOpts, inputPath)
  const { stdout, stderr } = await exec(commandLine, { cwd: tempDir })

  const cropSuffix = fullOpts.crop ? 'cropped.' : ''

  const outputs: Record<OutputFormat, Buffer> = fromEntries(
    fullOpts.formats.map(format => [
      format,
      readFileSync(join(tempDir, `score.${cropSuffix}${format}`)),
    ]),
  )

  const midi = fullOpts.midi
    ? readFileSync(join(tempDir, `score.midi`))
    : undefined

  return {
    stdout,
    stderr,
    outputs,
    midi,
  }
}
