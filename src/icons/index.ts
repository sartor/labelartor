/**
 * The app's icons: one SVG path each, drawn on a 16 × 16 grid.
 *
 * Rules that keep them crisp at 16 px (and 32 px):
 * - Every coordinate is a whole number, so straight edges land on pixel
 *   boundaries. Only 45° diagonals and arcs are anti-aliased.
 * - Strokes are 2 units wide; details are 1 unit.
 * - Paths fill with `evenodd` (see `AppIcon`), so a subpath inside another
 *   cuts a hole. Subpaths therefore never overlap; touching edges are fine.
 * - Shapes stay inside the grid: nothing is clipped.
 *
 * A unit test checks the whole-number and grid rules.
 */

export type IconPath = string

// Marks and arrows

export const IconX: IconPath = 'M3 4l1-1 4 4 4-4 1 1-4 4 4 4-1 1-4-4-4 4-1-1 4-4z'
export const IconChevronDown: IconPath = 'M3 6l1-1 4 4 4-4 1 1-5 5z'
export const IconChevronRight: IconPath = 'M6 3l1-1 5 5-5 5-1-1 4-4z'
/** Arrow pointing left with its tail coming down from the right: "back". */
export const IconArrowBackUp: IconPath = 'M1 7l4-4v8zM5 6h8v6h-2V8H5z'
/** Three-quarter ring with an arrowhead at its end. */
export const IconRefresh: IconPath = 'M8 2A6 6 0 1 0 14 8h-2A4 4 0 1 1 8 4zM11 8h4l-2-3z'
export const IconUpload: IconPath = 'M3 6l5-5 5 5zM7 6h2v5H7zM1 10h2v3h10v-3h2v5H1z'
export const IconDownload: IconPath = 'M7 1h2v5H7zM3 6h10l-5 5zM1 10h2v3h10v-3h2v5H1z'

// Status

export const IconCircleCheck: IconPath =
  'M8 1a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM3 8l1-1 3 3 4-4 1 1-5 5z'
export const IconCircleX: IconPath =
  'M8 1a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM8 3a5 5 0 1 1 0 10a5 5 0 1 1 0-10z' +
  'M5 6l1-1 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2z'
export const IconAlertTriangle: IconPath = 'M8 1l7 13H1zM7 5v5h2V5zM7 11v2h2v-2z'
export const IconAlertOctagon: IconPath = 'M5 1h6l4 4v6l-4 4H5l-4-4V5zM7 4v5h2V4zM7 10v2h2v-2z'
export const IconBluetooth: IconPath =
  'M7 1h2v14H7zM9 1l4 4-3 3 3 3-4 4v-2l2-2-2-2V7l2-2-2-2zM3 4l1-1 3 3v2zM3 12l1 1 3-3V8z'

// Text formatting

export const IconAlignLeft: IconPath = 'M2 1h12v2H2zM2 5h8v2H2zM2 9h12v2H2zM2 13h8v2H2z'
export const IconAlignCenter: IconPath = 'M2 1h12v2H2zM4 5h8v2H4zM2 9h12v2H2zM4 13h8v2H4z'
export const IconAlignRight: IconPath = 'M2 1h12v2H2zM6 5h8v2H6zM2 9h12v2H2zM6 13h8v2H6z'
/** An A on the tape, the blank tape drawn as an empty frame: text at the start, middle or end. */
export const IconTapeStart: IconPath =
  'M1 3h4v1h1v9H4v-3H2v3H0V4h1zM2 5h2v3H2zM8 3h8v10H8zM9 4h6v8H9z'
export const IconTapeCenter: IconPath =
  'M6 3h4v1h1v9H9v-3H7v3H5V4h1zM7 5h2v3H7zM0 3h4v10H0zM1 4h2v8H1zM12 3h4v10h-4zM13 4h2v8h-2z'
export const IconTapeEnd: IconPath =
  'M11 3h4v1h1v9h-2v-3h-2v3h-2V4h1zM12 5h2v3h-2zM0 3h8v10H0zM1 4h6v8H1z'
export const IconBold: IconPath = 'M3 2h8v1h2v4h-1v1h2v5h-2v1H3zM5 4h6v3H5zM5 9h7v3H5z'
/** Big and small T. */
export const IconTextSize: IconPath = 'M1 2h8v2H6v10H4V4H1zM11 6h2v2h2v2h-2v4h-2v-4H9V8h2z'
/** Up/down arrow beside text lines. */
export const IconLineHeight: IconPath =
  'M9 3h6v2H9zM9 7h6v2H9zM9 11h6v2H9zM1 5l3-3 3 3zM3 5h2v6H3zM1 11h6l-3 3z'
/** Capital A. */
export const IconTypography: IconPath = 'M6 2h4l4 12h-2l-1-3H5l-1 3H2zM7 5l-1 4h4l-1-4z'

// Objects

export const IconPrinter: IconPath = 'M4 1h8v3H4zM1 5h14v7H1zM4 10h8v2H4zM5 11h6v4H5z'
export const IconTrash: IconPath = 'M6 1h4v2H6zM2 3h12v2H2zM3 6h10v9H3zM6 8h1v5H6zM9 8h1v5H9z'
export const IconDeviceFloppy: IconPath = 'M1 1h11l3 3v11H1zM4 3v3h7V3zM4 9v4h8V9z'
export const IconPencil: IconPath = 'M9 3l4 4-6 6-4-4zM3 9l4 4-5 1z'
/** Lines with a plus: add to the list. */
export const IconPlaylistAdd: IconPath =
  'M1 2h14v2H1zM1 6h14v2H1zM1 10h6v2H1zM11 9h2v2h2v2h-2v2h-2v-2H9v-2h2z'
/** A clock. */
export const IconHistory: IconPath =
  'M8 1a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM8 3a5 5 0 1 1 0 10a5 5 0 1 1 0-10zM7 4h2v3h3v2H7z'
/** Stacked cylinder. */
export const IconDatabase: IconPath =
  'M2 3a6 2 0 0 1 12 0zM2 3h12v10a6 2 0 0 1-12 0zM3 7h10v1H3zM3 11h10v1H3z'
/** Ring with its right half filled: black on white / white on black. */
export const IconContrast: IconPath =
  'M8 1a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM8 3a5 5 0 1 1 0 10a5 5 0 1 1 0-10zM8 3a5 5 0 0 1 0 10z'
export const IconSun: IconPath =
  'M8 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zM13 7h3v2h-3z' +
  'M2 3l1-1 2 2-1 1zM13 2l1 1-2 2-1-1zM2 13l1 1 2-2-1-1zM13 14l1-1-2-2-1 1z'
export const IconMoonStars: IconPath =
  'M13 2A7 7 0 1 0 13 14A6 6 0 0 1 13 2zM14 1h1v1h1v1h-1v1h-1V3h-1V2h1z'
