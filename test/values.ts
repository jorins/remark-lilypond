/**
 * @module
 * Pre-set values for usage in tests
 */

import type { StrictLilypondOpts } from '../src/invokeLilypond'
import { WIN32_DEFAULT_PATH, ENV_PATH } from '../src/const'

const defaultBinary =
  process.platform === 'win32' ? WIN32_DEFAULT_PATH : ENV_PATH

const binary = process.env['LILYPOND_BIN'] ?? defaultBinary

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
