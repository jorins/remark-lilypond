import { XMLParser } from 'fast-xml-parser'
import type { MdxJsxAttribute } from './plugin'
import { RootContent } from 'mdast'

function patchAttributeName(tagName: string, attrName: string): string {
  switch (attrName) {
    case 'xmlns:xlink':
      return 'xmlnsXlink'
    case 'xlink:href':
      return 'href'
  }
  let patchedName = attrName
  {
    const [first, ...colonSegments] = attrName.split(':')
    patchedName = `${first}${colonSegments.map(s => `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`).join(':')}`
  }
  {
    const [first, ...dashSegments] = attrName.split('-')
    patchedName = `${first}${dashSegments.map(s => `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`).join('-')}`
  }
  return patchedName
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function elementToNode(name: string, el: any): RootContent {
  if (name === '#text') {
    return {
      type: 'text',
      value: el,
    }
  }
  if (el == null || typeof el !== 'object') {
    return {
      type: 'mdxJsxFlowElement',
      name,
      attributes: [],
      children:
        el != null
          ? [
              {
                type: 'text',
                value: String(el),
              },
            ]
          : [],
    }
  }
  const attributes = Object.entries(el)
    .filter(([key]) => key.startsWith('@_'))
    .map(([key, value]): MdxJsxAttribute => {
      return {
        type: 'mdxJsxAttribute',
        name: patchAttributeName(name, key.slice(2)),
        value: String(value),
      }
    })
  const children = Object.entries(el)
    .filter(([key]) => !key.startsWith('@_'))
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) return value.map(v => elementToNode(key, v))
      return elementToNode(key, value)
    })
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes,
    children,
  }
}

export function svgToHast(svgData: string | Buffer): RootContent {
  const parser = new XMLParser({
    ignoreAttributes: false,
  })
  const jObj = parser.parse(svgData)

  if (!jObj.svg || typeof jObj.svg !== 'object')
    throw new Error('Could not find root svg element')

  return elementToNode('svg', jObj.svg)
}
