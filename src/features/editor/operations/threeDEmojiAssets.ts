export const threeDEmojiCategories = ['Faces', 'Love', 'Reactions'] as const
export type ThreeDEmojiCategory = (typeof threeDEmojiCategories)[number]

export const threeDEmojiAssets = [
  {
    id: 'happy',
    displayName: 'Happy',
    category: 'Faces',
    thumbnail: '/emoji-3d/1f603.webp',
    modelPath: '/emoji-3d/models/happy.glb',
  },
  {
    id: 'heart-eyes',
    displayName: 'Heart eyes',
    category: 'Love',
    thumbnail: '/emoji-3d/1f60d.webp',
    modelPath: '/emoji-3d/models/heart-eyes.glb',
  },
  {
    id: 'angry',
    displayName: 'Angry',
    category: 'Reactions',
    thumbnail: '/emoji-3d/1f621.webp',
    modelPath: '/emoji-3d/models/angry.glb',
  },
] as const satisfies readonly {
  id: string
  displayName: string
  category: ThreeDEmojiCategory
  thumbnail: string
  modelPath: string
}[]

export type ThreeDEmojiAsset = (typeof threeDEmojiAssets)[number]

export function getThreeDEmojiAsset(id: string) {
  return threeDEmojiAssets.find((asset) => asset.id === id)
}
