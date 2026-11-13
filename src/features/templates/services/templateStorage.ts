import {
  deleteProjectStorageValues,
  loadProjectStorageEntries,
  loadProjectStorageValue,
  saveProjectStorageValues,
} from '../../editor/operations/projectStorage'
import {
  TEMPLATE_ASSET_PREFIX,
  TEMPLATE_PREFERENCES_KEY,
  TEMPLATE_STORAGE_PREFIX,
} from '../model/template.constants'
import type {
  EditorTemplate,
  PersistedTemplateAsset,
  TemplatePreferences,
} from '../model/template.types'
import { migrateTemplateRecord } from './templateSerializer'

function templateKey(id: string) {
  return `${TEMPLATE_STORAGE_PREFIX}${id}`
}

function assetKey(id: string) {
  return `${TEMPLATE_ASSET_PREFIX}${id}`
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `template-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function listUserTemplates() {
  const entries = await loadProjectStorageEntries<unknown>(TEMPLATE_STORAGE_PREFIX)
  const templates: EditorTemplate[] = []
  const issues: string[] = []
  entries.forEach(([key, value]) => {
    try {
      templates.push(migrateTemplateRecord(value))
    } catch (error) {
      issues.push(`${key}: ${error instanceof Error ? error.message : 'Template data could not be read.'}`)
    }
  })
  return { templates, issues }
}

export async function saveUserTemplate(
  template: Omit<EditorTemplate, 'id' | 'source' | 'createdAt' | 'updatedAt' | 'version'>,
  assets: PersistedTemplateAsset[],
) {
  const now = new Date().toISOString()
  const record: EditorTemplate = {
    ...template,
    id: createId(),
    source: 'user',
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
  await saveProjectStorageValues([
    ...assets.map((asset) => [assetKey(asset.id), asset] as [string, unknown]),
    [templateKey(record.id), record],
  ])
  return record
}

export async function updateUserTemplate(template: EditorTemplate, assets: PersistedTemplateAsset[] = []) {
  if (template.source !== 'user') throw new Error('Built-in templates cannot be changed directly.')
  const existing = await loadProjectStorageValue<unknown>(templateKey(template.id))
  if (!existing) throw new Error('This saved template no longer exists.')
  const previous = migrateTemplateRecord(existing)
  const updated = { ...template, version: 1, createdAt: previous.createdAt, updatedAt: new Date().toISOString() }
  await saveProjectStorageValues([
    ...assets.map((asset) => [assetKey(asset.id), asset] as [string, unknown]),
    [templateKey(updated.id), updated],
  ])
  const remainingReferences = new Set((await listUserTemplates()).templates
    .filter((item) => item.id !== updated.id)
    .flatMap((item) => item.assetReferences.map(({ assetId }) => assetId)))
  const orphanedAssets = previous.assetReferences
    .map(({ assetId }) => assetId)
    .filter((assetId) => !updated.assetReferences.some((reference) => reference.assetId === assetId) && !remainingReferences.has(assetId))
  if (orphanedAssets.length) await deleteProjectStorageValues(orphanedAssets.map(assetKey))
  return updated
}

export async function duplicateUserTemplate(template: EditorTemplate) {
  if (template.source !== 'user') throw new Error('Built-in templates must be saved as a new template first.')
  const assets = await Promise.all(template.assetReferences.map(async ({ assetId }) =>
    loadProjectStorageValue<PersistedTemplateAsset>(assetKey(assetId))))
  const availableAssets = assets.filter((asset): asset is PersistedTemplateAsset => Boolean(asset))
  if (availableAssets.length !== template.assetReferences.length) {
    throw new Error('One or more images used by this template are unavailable, so it could not be duplicated.')
  }
  return saveUserTemplate({
    ...template,
    name: `${template.name} copy`,
  }, availableAssets)
}

export async function deleteUserTemplate(template: EditorTemplate) {
  if (template.source !== 'user') throw new Error('Built-in templates cannot be deleted.')
  const templates = await listUserTemplates()
  const remainingReferences = new Set(templates.templates
    .filter((item) => item.id !== template.id)
    .flatMap((item) => item.assetReferences.map(({ assetId }) => assetId)))
  const orphanedAssets = template.assetReferences
    .map(({ assetId }) => assetId)
    .filter((assetId) => !remainingReferences.has(assetId))
  await deleteProjectStorageValues([
    templateKey(template.id),
    ...orphanedAssets.map(assetKey),
  ])
}

export async function loadTemplateAsset(assetId: string) {
  return loadProjectStorageValue<PersistedTemplateAsset>(assetKey(assetId))
}

export async function loadTemplatePreferences() {
  const saved = await loadProjectStorageValue<unknown>(TEMPLATE_PREFERENCES_KEY)
  if (!saved || typeof saved !== 'object') return undefined
  const value = saved as Partial<TemplatePreferences>
  const asStrings = (items: unknown) => Array.isArray(items)
    ? items.filter((item): item is string => typeof item === 'string')
    : []
  return {
    completedOnboarding: value.completedOnboarding === true,
    professions: asStrings(value.professions),
    industries: asStrings(value.industries),
    interests: asStrings(value.interests),
    designStyles: asStrings(value.designStyles),
    occasions: asStrings(value.occasions),
  }
}

export async function saveTemplatePreferences(preferences: TemplatePreferences) {
  await saveProjectStorageValues([[TEMPLATE_PREFERENCES_KEY, preferences]])
}