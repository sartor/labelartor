/** The project a first visit opens: a few labels that show what blocks can do. */

import { DEFAULT_TEXT_STYLE, createIconBlock, createSpaceBlock, createTextBlock } from './blocks'
import { createEntry } from './entries'
import { createProject, type Project } from './projects'
import type { LabelBlock } from './types'

const text = (value: string, fontFamily: string, bold = false) =>
  createTextBlock(value, { ...DEFAULT_TEXT_STYLE, fontFamily, bold })

const label = (...blocks: LabelBlock[]) => createEntry({ blocks })

export function createExampleProject(): Project {
  return createProject(
    'Example labels',
    [
      label(createIconBlock('ukraine-trident'), text('Пісні рузда', 'Russo One')),
      label(createIconBlock('usb-cable'), text('USB Type C', 'Roboto Condensed Variable', true)),
      label(createIconBlock('no-smoking'), text('Smoking not allowed', 'Oswald Variable')),
      label(
        createIconBlock('arrow-left'),
        createSpaceBlock(5),
        text('West', 'Golos Text Variable', true),
        createSpaceBlock(5),
        text('East', 'Golos Text Variable', true),
        createSpaceBlock(5),
        createIconBlock('arrow-right'),
      ),
    ],
    0,
  )
}
