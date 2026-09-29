/**
 * Pictures pasted from the clipboard, as RGBA pixels: PNG or JPEG images,
 * SVG files or SVG markup, and data URLs or bare base64 of PNG/JPEG in
 * text. The format is recognised from the content, not the stated type.
 */

export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Longest side pictures are drawn at: enough detail, and quick to trace. */
const SIZE = 512

const MIME_OF_BASE64: Record<string, string> = {
  iVBORw0KGgo: 'image/png',
  '/9j/': 'image/jpeg',
  R0lGOD: 'image/gif',
  UklGR: 'image/webp',
}

/** The picture on the clipboard via the async API; throws when the API is unavailable or denied. */
export async function readClipboardPicture(): Promise<Pixels | null> {
  if (!navigator.clipboard?.read) throw new Error('No clipboard read access')
  for (const item of await navigator.clipboard.read()) {
    // Pictures before text: an image copied from a page also carries its HTML.
    const types = [...item.types].sort((a, b) => rank(a) - rank(b))
    for (const type of types) {
      const pixels = await pixelsOf(await item.getType(type))
      if (pixels) return pixels
    }
  }
  return null
}

/** The picture in a paste event's data. */
export async function pastedPicture(data: DataTransfer): Promise<Pixels | null> {
  for (const file of data.files) {
    const pixels = await pixelsOf(file)
    if (pixels) return pixels
  }
  for (const type of ['image/svg+xml', 'text/plain', 'text/html']) {
    const text = data.getData(type)
    const pixels = text ? await pixelsOfText(text) : null
    if (pixels) return pixels
  }
  return null
}

const rank = (type: string) =>
  type.startsWith('image/') ? 0 : type === 'text/plain' ? 1 : type === 'text/html' ? 2 : 3

async function pixelsOf(blob: Blob): Promise<Pixels | null> {
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (png || jpeg || (blob.type.startsWith('image/') && blob.type !== 'image/svg+xml')) {
    try {
      return draw(await createImageBitmap(blob))
    } catch {
      // Not an image after all; maybe text.
    }
  }
  if (blob.size > 5_000_000) return null
  return pixelsOfText(await blob.text())
}

async function pixelsOfText(raw: string): Promise<Pixels | null> {
  const text = raw.trim()
  const svg = text.match(/<svg[\s>][\s\S]*<\/svg>/i)
  if (svg) return pixelsOfSvg(svg[0])
  const dataUrl = text.match(/data:image\/[\w.+-]+(;base64)?,[^\s"')]+/i)
  if (dataUrl) {
    const blob = await (await fetch(dataUrl[0])).blob()
    return blob.type === 'image/svg+xml' ? pixelsOfSvg(await blob.text()) : pixelsOf(blob)
  }
  const mime = Object.entries(MIME_OF_BASE64).find(([start]) => text.startsWith(start))?.[1]
  if (mime && /^[A-Za-z0-9+/=\s]+$/.test(text)) {
    const bytes = Uint8Array.from(atob(text.replace(/\s/g, '')), (c) => c.charCodeAt(0))
    return pixelsOf(new Blob([bytes], { type: mime }))
  }
  return null
}

/** Draws SVG markup at {@link SIZE} on its longest side. */
async function pixelsOfSvg(markup: string): Promise<Pixels | null> {
  // SVG copied out of an HTML page often lacks its namespace.
  const xml = /^<svg[^>]*\sxmlns=/i.test(markup)
    ? markup
    : markup.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml')
  const svg = doc.documentElement
  if (svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null
  const box = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  let w = box?.length === 4 ? box[2]! : parseFloat(svg.getAttribute('width') ?? '')
  let h = box?.length === 4 ? box[3]! : parseFloat(svg.getAttribute('height') ?? '')
  if (!(w > 0 && h > 0)) w = h = 1
  if (!svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  const scale = SIZE / Math.max(w, h)
  svg.setAttribute('width', String(Math.round(w * scale)))
  svg.setAttribute('height', String(Math.round(h * scale)))
  // Outside a page, currentColor would be black anyway; say so for every renderer.
  svg.setAttribute('color', '#000')
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
  )
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return draw(image, image.naturalWidth, image.naturalHeight)
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Pixels of a picture, shrunk to fit {@link SIZE} when larger. */
function draw(
  source: CanvasImageSource,
  w = (source as ImageBitmap).width,
  h = (source as ImageBitmap).height,
): Pixels | null {
  if (!w || !h) return null
  const scale = Math.min(1, SIZE / Math.max(w, h))
  const width = Math.max(1, Math.round(w * scale))
  const height = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return { data: ctx.getImageData(0, 0, width, height).data, width, height }
}
