import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, limit,
  getCountFromServer
} from 'firebase/firestore'

import { callApi } from './callApi'
import { db } from './firebase'

export const createNotification = async (userId, data) => {
  const notif = {
    userId,
    title: data.title || '',
    message: data.message || '',
    type: data.type || 'info',
    link: data.link || null,
    image: data.image || null,
    isRead: false,
    createdAt: new Date().toISOString()
  }

  const ref = await addDoc(collection(db, 'notifications'), {
    ...notif,
    createdAt: serverTimestamp()
  })
  return { id: ref.id, ...notif }
}

export const getUserNotifications = async (userId, limitCount = 50) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
  }))
}

export const markAsRead = async (notificationId, userId) => {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true })
}

export const markAllAsRead = async (userId) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d =>
    updateDoc(doc(db, 'notifications', d.id), { isRead: true })
  ))
}

export const countUnreadNotifications = async (userId) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  )
  const snap = await getCountFromServer(q)
  return snap.data().count
}

export const deleteNotification = async (notificationId, userId) => {
  await deleteDoc(doc(db, 'notifications', notificationId))
}

export const clearAllNotifications = async (userId) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'notifications', d.id))))
}

export const requestPushPermission = async () => {
  try {
    const { getMessaging, getToken } = await import('firebase/messaging')
    const messaging = getMessaging()
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('Thiếu VITE_FIREBASE_VAPID_KEY — không thể lấy FCM token.')
      return null
    }
    const token = await getToken(messaging, { vapidKey })
    return token
  } catch (err) {
    console.warn('FCM not available:', err.message)
    return null
  }
}

export const listenPushMessages = (callback) => {
  let unsubscribed = false
  import('firebase/messaging').then(({ getMessaging, onMessage }) => {
    if (unsubscribed) return
    const messaging = getMessaging()
    onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title || '',
        body: payload.notification?.body || '',
        data: payload.data || {}
      })
    })
  })

  return () => { unsubscribed = true }
}

export const sendEmailNotification = async (email, { userName, outfitCount = 1 }) => {
  try {
    const result = await callApi('sendOutfitCreatedEmail', {
      userEmail:   email,
      userName:    userName || 'bạn',
      outfitCount: outfitCount,
    })
    return result
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false }
  }
}

export const checkDailySuggestion = async (userId) => {
  const HOUR = 7
  const key = `lama_stylers_daily_notif_${userId}`
  const lastSent = localStorage.getItem(key)
  const today = new Date().toDateString()
  const now = new Date()

  if (lastSent === today) return
  if (now.getHours() < HOUR) return

  await createNotification(userId, {
    title: '👗 Gợi ý trang phục hôm nay',
    message: 'Lama Stylers đã sẵn sàng gợi ý outfit cho ngày mới của bạn!',
    type: 'info',
    link: '/outfits'
  })
  localStorage.setItem(key, today)
}
