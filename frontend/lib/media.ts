export type MediaItem = { url: string; type?: 'image' | 'video' }

export function isVideo(item: MediaItem) {
  return item.type === 'video' || /\.(mp4|webm|mov)$/i.test(item.url)
}
