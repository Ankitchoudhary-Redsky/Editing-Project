import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { getThreeDEmojiAsset } from './threeDEmojiAssets'

let loaderClassPromise: Promise<typeof import('three/addons/loaders/GLTFLoader.js').GLTFLoader> | null = null

export async function loadThreeDEmojiModel(id: string): Promise<GLTF> {
  const asset = getThreeDEmojiAsset(id)
  if (!asset) throw new Error(`Unknown 3D emoji asset: ${id}`)

  loaderClassPromise ??= import('three/addons/loaders/GLTFLoader.js').then((module) => module.GLTFLoader)
  const GLTFLoader = await loaderClassPromise
  return new GLTFLoader().loadAsync(asset.modelPath)
}