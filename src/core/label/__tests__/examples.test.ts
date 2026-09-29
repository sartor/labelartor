import { describe, expect, test } from 'bun:test'

import { isBundledFont } from '../../fonts'
import { createExampleProject } from '../examples'
import { findLabelIcon } from '../icons'

describe('example project', () => {
  test('uses only icons and fonts the app has', () => {
    const project = createExampleProject()
    expect(project.labels).toHaveLength(4)
    for (const { doc } of project.labels)
      for (const block of doc.blocks) {
        if (block.kind === 'icon') expect(findLabelIcon(block.icon)).toBeDefined()
        if (block.kind === 'text') expect(isBundledFont(block.fontFamily)).toBe(true)
      }
  })

  test('every call makes new ids', () => {
    const [a, b] = [createExampleProject(), createExampleProject()]
    expect(a.id).not.toBe(b.id)
    expect(a.labels[0]!.id).not.toBe(b.labels[0]!.id)
  })
})
