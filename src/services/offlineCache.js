import Dexie from 'dexie'

const _db = new Dexie('lama_stylers_offline_v1')

_db.version(1).stores({

  wardrobe: 'id, userId',
  outfits:  'id, userId',
  meta:     'key',
})

const safeAsync = (fn) => fn().catch(err => {
  console.warn('[offlineCache]', err.message)
  return null
})

export const wardrobeCache = {

  async save(uid, items) {
    await safeAsync(async () => {

      await _db.wardrobe.where('userId').equals(uid).delete()
      if (items.length > 0) {
        await _db.wardrobe.bulkPut(items.map(i => ({ ...i, userId: uid })))
      }
      await _db.meta.put({ key: `wardrobe_sync_${uid}`, ts: Date.now() })
    })
  },

  async load(uid) {
    try {
      const items = await _db.wardrobe.where('userId').equals(uid).toArray()

      return items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
        const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
        return tb - ta
      })
    } catch {
      return []
    }
  },

  async clear(uid) {
    await safeAsync(() => _db.wardrobe.where('userId').equals(uid).delete())
  },

  async lastSync(uid) {
    try {
      const m = await _db.meta.get(`wardrobe_sync_${uid}`)
      return m?.ts ?? null
    } catch { return null }
  },
}

export const outfitsCache = {
  async save(uid, items) {
    await safeAsync(async () => {
      await _db.outfits.where('userId').equals(uid).delete()
      if (items.length > 0) {
        await _db.outfits.bulkPut(items.map(i => ({ ...i, userId: uid })))
      }
      await _db.meta.put({ key: `outfits_sync_${uid}`, ts: Date.now() })
    })
  },

  async load(uid) {
    try {
      const items = await _db.outfits.where('userId').equals(uid).toArray()
      return items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
        const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
        return tb - ta
      })
    } catch {
      return []
    }
  },

  async clear(uid) {
    await safeAsync(() => _db.outfits.where('userId').equals(uid).delete())
  },

  async lastSync(uid) {
    try {
      const m = await _db.meta.get(`outfits_sync_${uid}`)
      return m?.ts ?? null
    } catch { return null }
  },
}

export async function clearAllCache(uid) {
  await Promise.allSettled([
    wardrobeCache.clear(uid),
    outfitsCache.clear(uid),
    safeAsync(() => _db.meta.where('key').startsWith(`wardrobe_sync_${uid}`).delete()),
    safeAsync(() => _db.meta.where('key').startsWith(`outfits_sync_${uid}`).delete()),
  ])
}
