/**
 * @module
 * Pre-set values for usage in tests
 */

import type { StrictLilypondOpts } from '../src/invokeLilypond'
import { USE_ENV_BINARY } from '../src/const'

const binary =
  process.env['LILYPOND_BIN'] === undefined
    ? USE_ENV_BINARY
    : process.env['LILYPOND_BIN']

export const score = `\\version "2.24"

\\score {
  {
    d4 e f g
  }
  \\layout { }
  \\midi { }
}`

export const music = `d4 e f g`
export const version = '2.24'
export const opts: StrictLilypondOpts = {
  binary,
  version,
  crop: false,
  wrap: true,
  midi: true,
  formats: [],
  dpi: null,
}
export const outputPath = '"score"'
