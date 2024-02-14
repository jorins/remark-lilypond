import type { Plugin, Transformer } from 'unified'
import type { Root, Parent, Code } from 'mdast'
import type { LilypondOpts, OutputFormat } from './invokeLilypond'

import { visit } from 'unist-util-visit'
import { Lilypond } from './component'
import { invokeLilypond } from './invokeLilypond'
import { parseMeta } from './parseMeta'

/**
 * Method of rendering
 */
export type Strategy = 'img-svg' | 'img-png' | 'inline-svg'

/**
 * Plugin configuration interface
 */
export interface RemarkLilypondConfig extends Omit<LilypondOpts, 'formats'> {
  /**
   * Which method of rendering to use. One of 'img-svg', 'img-png', and
   * 'inline-svg'.
   *
   * @default inline-svg
   */
  strategy: Strategy
}

/**
 * Default plugin configuration. These options are intended to be reasonable
 * defaults for rendering to web.
 */
const defaultConfig: RemarkLilypondConfig = {
  strategy: 'inline-svg',
  wrap: true,
  crop: true,
  midi: true,
  dpi: 72,
}

/**
 * The remark lilypond plugin
 */
export const remarkLilypond: Plugin<
  [RemarkLilypondConfig | undefined],
  Root
> = pluginOpts => {
  const transformer: Transformer<Root, Root> = async (ast) => {
    type Target = {
      node: Code
      index: number
      parent: Parent
    }
    const targets: Target[] = []

    visit(ast, { type: 'code', lang: 'lilypond' }, (
      node: Code,
      index: number | undefined,
      parent: Parent | undefined,
    ) => {
      if (index === undefined) {
        throw new Error('Node has no index')
      }

      if (parent === undefined) {
        throw new Error('Node has no parent')
      }

      if (! ('children' in parent)) {
        throw new Error('Parent has no children')
      }

      targets.push({node, index, parent})
    })

    for (const {node, index, parent} of targets) {
      // Build per-snippet config
      const parsedMeta = parseMeta(node.meta ?? '')
      const snippetConfig: RemarkLilypondConfig = {
        ...defaultConfig,
        ...(pluginOpts ?? {}),
        ...parsedMeta,
      }

      const format: OutputFormat =
        snippetConfig.strategy === 'img-png' ? 'png' : 'svg'

      // Derive lilypond opts from plugin opts
      const lilypondOpts: LilypondOpts = {
        ...snippetConfig,
        formats: [format],
      }

      // Build lilypond
      const res = await invokeLilypond(node.value, lilypondOpts)
      const outputBinary = res.outputs[format]
      if (outputBinary === undefined) {
        throw new Error(
          `Snippet with strategy ${snippetConfig.strategy} gave empty output binary for format ${format}`,
        )
      }

      console.log({node, res})
      if (snippetConfig.strategy === 'inline-svg') {
        parent.children[index] = {
          type: 'html',
          value: Lilypond({
            data: outputBinary.toString(),
            displayAs: 'inline'
          })
        }
      } else {
        const uri = `data:image/${format};base64,${outputBinary.toString('base64')}`
        parent.children[index] = {
          type: 'image',
          url: uri,
          data: { unoptimized: true }
        }
      }
    }

    console.log(JSON.stringify(ast, undefined, 2))
    return ast
  }

  return transformer
}
