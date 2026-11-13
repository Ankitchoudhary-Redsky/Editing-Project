import type { Canvas } from 'fabric'
import {
  getImageSourceTokens,
  resolveImageSourceToken,
  serializeCanvas,
} from '../../editor/model/constants'
import type {
  EditorTemplate,
  PersistedTemplateAsset,
  TemplateAssetReference,
  TemplateFabricData,
} from '../model/template.types'

const TEMPLATE_ASSET_SCHEME = 'template-asset://'

function fallbackHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

async function hashAsset(value: string) {
  if (!globalThis.crypto?.subtle) return fallbackHash(value)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function serializeTemplateCanvas(canvas: Canvas): Promise<{
  fabricData: TemplateFabricData
  assetReferences: TemplateAssetReference[]
  assets: PersistedTemplateAsset[]
}> {
  const fabricData = JSON.parse(serializeCanvas(canvas)) as TemplateFabricData
  const imageSources = getImageSourceTokens()
  const assetReferences: TemplateAssetReference[] = []
  const assets = new Map<string, PersistedTemplateAsset>()

  const replaceSources = async (value: unknown): Promise<void> => {
    if (Array.isArray(value)) {
      await Promise.all(value.map(replaceSources))
      return
    }
    if (!value || typeof value !== 'object') return

    await Promise.all(Object.entries(value).map(async ([key, child]) => {
      if (key === 'src' && typeof child === 'string') {
        const source = imageSources[child] ?? resolveImageSourceToken(child)
        if (source?.startsWith('data:image/')) {
          const assetId = await hashAsset(source)
          ;(value as Record<string, unknown>)[key] = `${TEMPLATE_ASSET_SCHEME}${assetId}`
          assetReferences.push({ token: child, assetId })
          if (!assets.has(assetId)) {
            assets.set(assetId, { id: assetId, data: source, createdAt: new Date().toISOString() })
          }
        }
        return
      }
      await replaceSources(child)
    }))
  }

  await replaceSources(fabricData.scene)
  fabricData.scene.objects = Array.isArray(fabricData.scene.objects)
    ? fabricData.scene.objects.filter((object) => {
      if (!object || typeof object !== 'object') return true
      const name = (object as Record<string, unknown>).name
      return name !== '__pixel_studio_drawing_preview__' && name !== 'Crop area'
    })
    : []

  return { fabricData, assetReferences, assets: [...assets.values()] }
}

export async function hydrateTemplateFabricData(
  template: EditorTemplate,
  loadAsset: (assetId: string) => Promise<PersistedTemplateAsset | undefined>,
): Promise<TemplateFabricData> {
  const fabricData = structuredClone(template.fabricData)
  const references = new Map(template.assetReferences.map(({ assetId }) => [
    `${TEMPLATE_ASSET_SCHEME}${assetId}`,
    assetId,
  ]))
  const sourceByAssetId = new Map<string, string>()

  await Promise.all([...references.values()].map(async (assetId) => {
    const asset = await loadAsset(assetId)
    if (!asset || !asset.data.startsWith('data:image/')) {
      throw new Error(`An image used by “${template.name}” is unavailable.`)
    }
    sourceByAssetId.set(assetId, asset.data)
  }))

  const restoreSources = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(restoreSources)
      return
    }
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (key === 'src' && typeof child === 'string' && references.has(child)) {
        const assetId = references.get(child)!
        ;(value as Record<string, unknown>)[key] = sourceByAssetId.get(assetId)
      } else {
        restoreSources(child)
      }
    }
  }

  restoreSources(fabricData.scene)
  return fabricData
}

export function migrateTemplateRecord(value: unknown): EditorTemplate {
  if (!value || typeof value !== 'object') throw new Error('This template record is corrupted.')
  const record = value as Partial<EditorTemplate>
  const schemaVersion = Number(record.version ?? 0)
  if (schemaVersion > 1) throw new Error('This template was saved by a newer version of the editor.')

  const fabricData = record.fabricData
  if (!fabricData || !Number.isFinite(fabricData.width) || !Number.isFinite(fabricData.height) ||
    !fabricData.scene || typeof fabricData.scene !== 'object') {
    throw new Error('This template does not contain a valid editable design.')
  }

  const now = new Date().toISOString()
  const width = fabricData.width
  const height = fabricData.height
  return {
    id: String(record.id ?? ''),
    designId: typeof record.designId === 'string' ? record.designId : String(record.id ?? ''),
    name: String(record.name ?? 'Untitled template'),
    description: String(record.description ?? ''),
    category: String(record.category ?? 'personal'),
    subcategory: record.subcategory,
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    source: record.source === 'builtin' ? 'builtin' : 'user',
    profession: record.profession,
    industry: record.industry,
    occasion: record.occasion,
    designStyles: Array.isArray(record.designStyles)
      ? record.designStyles.filter((style): style is string => typeof style === 'string')
      : [],
    supportedFormats: Array.isArray(record.supportedFormats)
      ? record.supportedFormats.filter((format): format is string => typeof format === 'string')
      : ['image'],
    orientation: record.orientation ?? (width === height ? 'square' : width > height ? 'landscape' : 'portrait'),
    width,
    height,
    thumbnail: typeof record.thumbnail === 'string' ? record.thumbnail : '',
    fabricData,
    assetReferences: Array.isArray(record.assetReferences) ? record.assetReferences : [],
    version: 1,
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
    featured: record.featured,
  }
}