import type { StickerAnimationAsset } from '../model/types'

const DATABASE_NAME = 'estudio-projects'
const STORE_NAME = 'drafts'
const DRAFT_KEY = 'current-project'
const STICKER_ANIMATION_KEY_PREFIX = 'sticker-animation:'
let databasePromise: Promise<IDBDatabase> | null = null
let writeQueue: Promise<void> = Promise.resolve()

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        if (databasePromise === opening) databasePromise = null
      }
      resolve(database)
    }
    request.onerror = () => {
      if (databasePromise === opening) databasePromise = null
      reject(request.error)
    }
  })

  databasePromise = opening
  return opening
}

function enqueueWrite(operation: (store: IDBObjectStore) => void): Promise<void> {
  const write = writeQueue.then(async () => {
    const database = await openDatabase()

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      operation(transaction.objectStore(STORE_NAME))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  })

  writeQueue = write.catch(() => {})
  return write
}

export async function loadProjectDraft<T>(): Promise<T | undefined> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(DRAFT_KEY)
    let draft: T | undefined

    request.onsuccess = () => {
      draft = request.result as T | undefined
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => resolve(draft)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function saveProjectDraft<T>(draft: T): Promise<void> {
  return enqueueWrite((store) => {
    store.put(draft, DRAFT_KEY)
  })
}

export function deleteProjectDraft(): Promise<void> {
  return enqueueWrite((store) => {
    store.delete(DRAFT_KEY)
  })
}

export async function loadProjectStorageValue<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)
    let value: T | undefined

    request.onsuccess = () => {
      value = request.result as T | undefined
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => resolve(value)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function loadProjectStorageEntries<T>(prefix: string): Promise<Array<[string, T]>> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const keysRequest = store.getAllKeys()
    const valuesRequest = store.getAll()

    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
    keysRequest.onerror = () => reject(keysRequest.error)
    valuesRequest.onerror = () => reject(valuesRequest.error)
    transaction.oncomplete = () => {
      const entries = keysRequest.result.flatMap((key, index) => {
        if (typeof key !== 'string' || !key.startsWith(prefix)) return []
        return [[key, valuesRequest.result[index] as T] as [string, T]]
      })
      resolve(entries)
    }
  })
}

export function saveProjectStorageValues(entries: Array<[string, unknown]>): Promise<void> {
  return enqueueWrite((store) => {
    entries.forEach(([key, value]) => store.put(value, key))
  })
}

export function deleteProjectStorageValues(keys: string[]): Promise<void> {
  return enqueueWrite((store) => {
    keys.forEach((key) => store.delete(key))
  })
}

export function saveStickerAnimation(id: string, asset: StickerAnimationAsset): Promise<void> {
  return enqueueWrite((store) => {
    store.put(asset, `${STICKER_ANIMATION_KEY_PREFIX}${id}`)
  })
}

export async function loadStickerAnimation(id: string): Promise<StickerAnimationAsset | undefined> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(`${STICKER_ANIMATION_KEY_PREFIX}${id}`)
    request.onsuccess = () => resolve(request.result as StickerAnimationAsset | undefined)
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}