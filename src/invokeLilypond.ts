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
 * PS and EPS are not supported.
 */
export type OutputFormat = 'eps' | 'pdf' | 'png' | 'ps' | 'svg'

/**
 * Lilypond opts with all options set. For internal use.
 */
export type StrictLilypondOpts<Format extends OutputFormat = OutputFormat> = {
  /**
   * Lilypond binary to invoke
   *
   * @default `lilypond.exe` for Windows; otherwise `/usr/bin/env lilypond`
   */
  binary: string

  /**
   * Lilypond version to use. This value will be written to the `\\version` at
   * the top of the score.
   *
   * @default 2.24
   */
  version: string

  /**
   * List of formats to render. SVG cannot be used along with other graphical formats, and
   * EPS is presently not allowed.
   *
   * @default ['svg']
   */
  formats: Format[]

  /**
   * Whether to crop the output.
   *
   * @default true
   */
  crop: boolean

  /**
   * DPI of PNG output. If null, let Lilypond determine the default (101 as of writing).
   *
   * @default null
   */
  dpi: number | null

  /**
   * Whether to output MIDI
   *
   * @default true
   */
  midi: boolean
}

/**
 * Options for invoking lilypond. For external use.
 */
export type LilypondOpts<Format extends OutputFormat = OutputFormat> = Partial<
  StrictLilypondOpts<Format>
>

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
 * Default opts
 */
const defaults: StrictLilypondOpts = {
  binary: os.type() === 'Windows_NT' ? 'lilypond.exe' : '/usr/bin/env lilypond',
  version: '2.24',
  formats: ['svg'],
  crop: true,
  dpi: null,
  midi: true,
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

  const score = wrapMusic(music, fullOpts)
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
