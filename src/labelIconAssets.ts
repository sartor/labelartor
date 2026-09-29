/**
 * Decodes the label icon PNGs (bundled inline) and registers their dots,
 * so every icon can be drawn at once, without waiting, once this is done.
 */
import { ICON_GRID, findLabelIcon, registerIconDots } from '@/core/label'

const pngs = import.meta.glob<string>('@/assets/label-icons/*.png', {
  eager: true,
  query: '?inline',
  import: 'default',
})

async function decode(url: string) {
  const image = await createImageBitmap(await (await fetch(url)).blob())
  const canvas = new OffscreenCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas is not available')
  ctx.drawImage(image, 0, 0)
  const { data } = ctx.getImageData(0, 0, image.width, image.height)
  const dots = new Uint8Array(image.width * image.height)
  for (let i = 0; i < dots.length; i++) dots[i] = data[i * 4 + 3]! >= 128 ? 1 : 0
  return { width: image.width, height: image.height, data: dots }
}

export async function loadLabelIcons(): Promise<void> {
  await Promise.all(
    Object.entries(pngs).map(async ([path, url]) => {
      const id = path.slice(path.lastIndexOf('/') + 1, -'.png'.length)
      const icon = findLabelIcon(id)
      if (!icon) return
      const dots = await decode(url)
      if (dots.width !== icon.width || dots.height !== ICON_GRID) {
        console.warn(
          `Icon ${id} is ${dots.width}×${dots.height}, expected ${icon.width}×${ICON_GRID}`,
        )
      }
      registerIconDots(id, dots)
    }),
  )
}
