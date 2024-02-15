/**
 * @module
 * Utilities surrounding lilypond
 */

import {
  USE_ENV,
  type StrictLilypondOpts,
  outputFormats,
  OutputFormat,
} from './invokeLilypond'
import {
  ErrorCtors,
  InvalidValueError,
  TypeDef,
  assertType,
  getTypeName,
  isType,
  typeMapString,
  union,
} from './typeGuards'

import { multiline } from './util'

/**
 * Add a lilypond version and put music in a \score block. This is required for
 * generating MIDI output. Throws if the input already has a \version tag.
 */
export function wrapMusic(music: string, opts: StrictLilypondOpts): string {
  if (music.includes('\\version')) {
    throw new Error(
      `Asked to wrap music but input already contains \\version: ${music}`,
    )
  }

  const midi = opts.midi ? `  \\midi { }` : null

  const layout = opts.formats.length > 0 ? `  \\layout { }` : null

  return multiline(
    `\\version "${opts.version}"`,
    `\\score {`,
    `  { ${music} }`,
    layout,
    midi,
    `}`,
  )
}

export class InvalidOptionsError extends InvalidValueError {
  static TypeError = class InvalidOptionsTypeError extends InvalidOptionsError {
    constructor(path: PropertyKey[], type: TypeDef, value: unknown) {
      super(path, typeMapString(type), getTypeName(value))
    }
  }
}

function assertOutputFormatsArray(
  formats: unknown,
  { InvalidValueError }: ErrorCtors,
  path: PropertyKey[],
): asserts formats is OutputFormat[] {
  if (!isType(formats, ['string']))
    throw new InvalidValueError(
      path,
      `["svg"] | array<${outputFormats
        .filter(f => f !== 'svg')
        .map(f => JSON.stringify(f))
        .join(' | ')}>`,
      getTypeName(formats),
    )
  const invalidIndex = formats.findIndex(
    f => !(outputFormats as readonly string[]).includes(f),
  )
  if (invalidIndex > -1)
    throw new InvalidValueError(
      [...path, invalidIndex],
      outputFormats.map(f => JSON.stringify(f)).join(' | '),
      JSON.stringify(formats[invalidIndex]),
    )
}

function assertValidFormats(
  formats: unknown,
  ErrorCtors: ErrorCtors,
  path: PropertyKey[],
): asserts formats is StrictLilypondOpts['formats'] {
  assertOutputFormatsArray(formats, ErrorCtors, path)
  // SVG cannot be generated along with other formats, see
  // https://lilypond.org/doc/v2.24/Documentation/usage/command_002dline-usage#basic-command-line-options-for-lilypond
  if (formats.includes('svg') && formats.length > 1) {
    throw new ErrorCtors.InvalidValueError(
      path,
      `["svg"] | array<${outputFormats
        .filter(f => f !== 'svg')
        .map(f => JSON.stringify(f))
        .join(' | ')}>`,
      `array<${[...new Set(formats)].map(s => JSON.stringify(s)).join(' | ')}>`,
    )
  }
}

/**
 * Validate lilypond options. Throws if any given options are invalid.
 */
export function validateOptions(
  opts: unknown,
): asserts opts is StrictLilypondOpts {
  assertType(
    opts,
    {
      binary: union('string', USE_ENV),
      version: 'string',
      formats: assertValidFormats,
      crop: 'boolean',
      dpi: union('number', 'null'),
      midi: 'boolean',
      wrap: 'boolean',
    },
    {
      InvalidValueError: InvalidOptionsError,
      InvalidTypeError: InvalidOptionsError.TypeError,
    },
  )
  opts satisfies StrictLilypondOpts
}

/**
 * Generate the full command to invoke lilypond with.
 */
export function computeArgs(
  opts: StrictLilypondOpts,
  outPath: string,
): string[] {
  const args = []

  for (const format of opts.formats) {
    args.push(`--format=${format}`)
  }

  if (opts.crop === true) {
    args.push('--define-default=crop')
  }

  if (opts.dpi !== null) {
    args.push(`--define-default=resolution=${opts.dpi}`)
  }

  args.push(`--output=${outPath}`)

  args.push('--define-default=no-point-and-click')

  args.push('-')

  return args
}
