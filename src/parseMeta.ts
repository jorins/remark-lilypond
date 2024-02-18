import type { RemarkLilypondConfig, Strategy } from './plugin'

export function parseMeta(meta: string): Partial<RemarkLilypondConfig> {
  // Exit early to avoid unnecessary warnings when input is blank
  if (meta === '') {
    return {}
  }

  const out: Partial<RemarkLilypondConfig> = {}

  for (const opt of meta.split(' ')) {
    const [key, value] = opt.split('=')
    switch (key) {
      case 'strategy':
        if (!['img-svg', 'img-png', 'inline-svg'].includes(value)) {
          throw new Error(`Invalid strategy '${value}'`)
        }

        out.strategy = value as Strategy
        break

      case 'binary':
      case 'version':
        out[key] = value
        break

      case 'dpi':
        if (Number.isNaN(Number.parseInt(value))) {
          throw new Error(`Failed to parse DPI value '${value}' as integer`)
        }
        out.dpi = Number.parseInt(value)
        break

      case 'crop':
        out.crop = true
        break

      case 'nocrop':
        out.crop = false
        break

      case 'wrap':
        out.wrap = true
        break

      case 'nowrap':
        out.wrap = false
        break

      default:
        console.warn(`Unhandled LilyPond option '${opt}'`)
    }
  }

  return out
}
