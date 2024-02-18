import type { Plugin, Transformer } from 'unified'
import type { Root, Parent, Code } from 'mdast'
import type { LilypondOpts } from './invokeLilypond'

import { visit } from 'unist-util-visit'
import { Program } from 'estree'
import { invokeLilypond } from './invokeLilypond'
import { parseMeta } from './parseMeta'
import { dataUri } from './util'
import { svgToHast } from './svgToHast'

declare module 'mdast' {
  export interface RootContentMap {
    mdxJsxFlowElement: MdxJsxFlowElement
  }
}

export interface MdxJsxAttributeValueExpression {
  type: 'mdxJsxAttributeValueExpression'
  value: string
  data: {
    estree: Program
  }
}

export interface MdxJsxAttribute {
  type: 'mdxJsxAttribute'
  name: string
  value: MdxJsxAttributeValueExpression | string
}

export interface MdxJsxFlowElement extends Parent {
  type: 'mdxJsxFlowElement'
  name: string
  attributes?: MdxJsxAttribute[]
}

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
  const transformer: Transformer<Root, Root> = async ast => {
    type Target = {
      node: Code
      index: number
      parent: Parent
    }
    const targets: Target[] = []

    visit(
      ast,
      { type: 'code', lang: 'lilypond' },
      (node: Code, index: number | undefined, parent: Parent | undefined) => {
        if (index === undefined) {
          throw new Error('Node has no index')
        }

        if (parent === undefined) {
          throw new Error('Node has no parent')
        }

        if (!('children' in parent)) {
          throw new Error('Parent has no children')
        }

        targets.push({ node, index, parent })
      },
    )

    for (const { node, index, parent } of targets) {
      // Build per-snippet config
      const parsedMeta = parseMeta(node.meta ?? '')
      const snippetConfig: RemarkLilypondConfig = {
        ...defaultConfig,
        ...(pluginOpts ?? {}),
        ...parsedMeta,
      }

      const formats = (
        snippetConfig.strategy === 'img-png' ? ['png'] : ['svg']
      ) satisfies LilypondOpts['formats']
      const [format] = formats

      // Derive lilypond opts from plugin opts
      const lilypondOpts: LilypondOpts & {
        formats: typeof formats
      } = {
        ...snippetConfig,
        formats,
      }

      // Build lilypond
      const res = await invokeLilypond(node.value, lilypondOpts)
      const outputBinary = res.outputs[format]
      if (snippetConfig.strategy === 'inline-svg') {
        parent.children[index] = svgToHast(outputBinary)
      } else {
        const uri = dataUri(format, outputBinary)
        parent.children[index] = {
          type: 'mdxJsxFlowElement',
          name: 'img',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'src',
              value: uri,
            },
          ],
          children: [],
        }
      }
    }
    return ast
  }

  return transformer
}
