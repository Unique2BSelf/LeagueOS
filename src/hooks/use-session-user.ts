'use client'

import { useEffect, useState } from 'react'
import { syncStoredUser, type StoredUser } from '@/lib/client-auth'

export function useSessionUser() {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    syncStoredUser()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  return { user, loading, setUser }
}
