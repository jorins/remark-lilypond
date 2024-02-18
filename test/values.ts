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

export const version = '2.22'
export const music = `d4 e f g`
export const score = `\\version "${version}"

\\score {
  {
    ${music}
  }
  \\layout { }
  \\midi { }
}`

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
