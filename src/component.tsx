'use server'

import type { ReactElement } from 'react'

// import React, { useEffect, useRef, useState } from 'react'
// import { invokeLilypond } from './invokeLilypond'

interface LilypondProps {
  data: string
  displayAs: 'data' | 'inline'
}

export function Lilypond({data, displayAs}: LilypondProps): ReactElement {
  if (displayAs === 'data') {
    return <img src={data} />
  } else {
    return <div dangerouslySetInnerHTML={{__html: data}} />
  }
}

/*
export function Lilypond({ data, displayAs }: LilypondProps): ReactElement {
  const [content, setContent] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const htmlElement = document.documentElement
    const mutationObserver = new MutationObserver(render)
    mutationObserver.observe(htmlElement, { attributes: true })
    render()

    return () => {
      mutationObserver.disconnect()
    }

    async function render() {
      try {
        setContent(content)
      } catch (error) {
        console.error(error)
      }
    }
  }, [data])

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: content }} />
  )
}
*/
