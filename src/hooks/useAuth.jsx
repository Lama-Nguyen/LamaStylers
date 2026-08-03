import {
  createContext, useContext, useEffect, useState, useRef, useCallback
} from 'react'
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { touchLastActive } from '../services/lastActiveService'
import { claimDailyLoginCredits } from '../services/creditService'
import { showToast } from '../components/notifications/ToastNotification'

import { isPremiumExpired } from '../services/giftCodeService'

const AuthContext = createContext(null)

const POLL_INTERVAL_MS = 5 * 60 * 1000

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const unsubProfileRef      = useRef(null)
  const pollTimerRef         = useRef(null)
  const uidRef               = useRef(null)
  const dailyCreditClaimedRef = useRef(false)

  const helpersRef = useRef({})

  helpersRef.current.stopSnapshot = () => {
    if (unsubProfileRef.current) {
      unsubProfileRef.current()
      unsubProfileRef.current = null
    }
  }

  helpersRef.current.stopPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  helpersRef.current.stopAll = () => {
    helpersRef.current.stopSnapshot()
    helpersRef.current.stopPoll()
  }

  helpersRef.current.fetchProfileOnce = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      const data = snap.exists() ? snap.data() : null
      setProfile(data)
      return data
    } catch (err) {
      console.error('fetchProfileOnce lỗi:', err)
      return null
    }
  }

  helpersRef.current.startSnapshot = (uid) => {
    helpersRef.current.stopSnapshot()
    unsubProfileRef.current = onSnapshot(
      doc(db, 'users', uid),
      (snap) => setProfile(snap.exists() ? snap.data() : null),
      (err) => console.error('onSnapshot lỗi:', err)
    )
  }

  helpersRef.current.upgradeToSnapshot = (uid) => {
    helpersRef.current.stopPoll()
    helpersRef.current.startSnapshot(uid)
  }

  helpersRef.current.startPoll = () => {
    helpersRef.current.stopPoll()
    pollTimerRef.current = setInterval(async () => {
      const currentUid = uidRef.current
      if (!currentUid) return
      const data = await helpersRef.current.fetchProfileOnce(currentUid)
      if (data?.isPremium === true) {
        helpersRef.current.upgradeToSnapshot(currentUid)
      }
    }, POLL_INTERVAL_MS)
  }

  useEffect(() => {
    const h = helpersRef.current
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      h.stopAll()
      uidRef.current = u?.uid ?? null
      setUser(u)

      if (!u) {
        setProfile(null)
        setLoading(false)

        dailyCreditClaimedRef.current = false
        return
      }

      touchLastActive(u.uid)

      const data = await h.fetchProfileOnce(u.uid)

      if (!dailyCreditClaimedRef.current && !data?.isPremium) {
        dailyCreditClaimedRef.current = true
        claimDailyLoginCredits(u.uid).then(({ granted, amount }) => {
          if (granted) {
            showToast.success(`⚡ +${amount} credit hàng ngày!`, 3500)
          }
        }).catch(e => console.warn('claimDailyLoginCredits lỗi:', e))
      }

      if (data?.isPremium === true) {
        h.startSnapshot(u.uid)
      } else {
        h.startPoll()
      }

      setLoading(false)
    })

    return () => {
      unsubAuth()
      helpersRef.current.stopAll()
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const data = await helpersRef.current.fetchProfileOnce(user.uid)
    if (data?.isPremium === true && !unsubProfileRef.current) {
      helpersRef.current.upgradeToSnapshot(user.uid)
    }
  }, [user])

  const setRememberMe = useCallback(async (remember) => {
    const persistence = remember
      ? browserLocalPersistence
      : browserSessionPersistence
    await setPersistence(auth, persistence)
  }, [])

  const isPremium = profile?.isPremium === true && !isPremiumExpired(profile?.premiumExpiry)
  const credits   = profile?.credits ?? 0

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      refreshProfile,
      isPremium,
      credits,
      setRememberMe,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
