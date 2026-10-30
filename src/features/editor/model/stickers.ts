import type { StickerPreset } from './types'
export type { StickerPreset } from './types'

export const stickerCollections: { title: string; stickers: StickerPreset[] }[] = [
  {
    title: 'Magic recommendations',
    stickers: [
      { name: 'Curious cat', emoji: '🐱', motion: 'wiggle', tone: 'rose' },
      { name: 'Little rabbit', emoji: '🐰', motion: 'bounce', tone: 'lilac' },
      { name: 'Happy spider', emoji: '🕷️', motion: 'bounce', tone: 'mint' },
      { name: 'Cosmic sparkle', emoji: '✨', motion: 'spin', tone: 'gold' },
      { name: 'Sleepy moon', emoji: '🌙', motion: 'wiggle', tone: 'blue' },
      { name: 'Tiny ghost', emoji: '👻', motion: 'bounce', tone: 'lilac' },
    ],
  },
  {
    title: 'Featured',
    stickers: [
      { name: 'Wise owl', emoji: '🦉', motion: 'pulse', tone: 'gold' },
      { name: 'Flower offering', emoji: '💐', motion: 'wiggle', tone: 'rose' },
      { name: 'Lotus bloom', emoji: '🪷', motion: 'pulse', tone: 'rose' },
      { name: 'Pink bow', emoji: '🎀', motion: 'wiggle', tone: 'lilac' },
      { name: 'Sunflower', emoji: '🌻', motion: 'spin', tone: 'gold' },
      { name: 'Cherry blossom', emoji: '🌸', motion: 'bounce', tone: 'rose' },
    ],
  },
  {
    title: 'Animations',
    stickers: [
      { name: 'Fire flame', emoji: '🔥', motion: 'bounce', tone: 'gold' },
      { name: 'Shooting star', emoji: '🌠', motion: 'spin', tone: 'blue' },
      { name: 'Confetti burst', emoji: '🎉', motion: 'wiggle', tone: 'mint' },
      { name: 'Dizzy heart', emoji: '💖', motion: 'pulse', tone: 'rose' },
      { name: 'Party popper', emoji: '🎊', motion: 'spin', tone: 'lilac' },
      { name: 'Rainbow', emoji: '🌈', motion: 'wiggle', tone: 'blue' },
    ],
  },
  {
    title: 'Reactions',
    stickers: [
      { name: 'Big love', emoji: '❤️', motion: 'pulse', tone: 'rose' },
      { name: 'Thumbs up', emoji: '👍', motion: 'bounce', tone: 'mint' },
      { name: 'Clapping hands', emoji: '👏', motion: 'wiggle', tone: 'gold' },
      { name: 'Laughing face', emoji: '😂', motion: 'bounce', tone: 'blue' },
      { name: 'Fire reaction', emoji: '💯', motion: 'pulse', tone: 'rose' },
      { name: 'Sparkling heart', emoji: '💝', motion: 'spin', tone: 'lilac' },
    ],
  },
]