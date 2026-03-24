import { useEffect, useMemo, useState } from 'react'

import { api } from '@/infrastructure/http/api'

const EMPTY_CAPABILITY = {
  provider: 'aws',
  status: 'unknown',
  features: {},
}

export function useProviderCapabilities() {
  const [capabilities, setCapabilities] = useState([])

  useEffect(() => {
    let alive = true

    const loadCapabilities = async () => {
      try {
        const response = await api.listProviderCapabilities()
        if (alive) setCapabilities(Array.isArray(response) ? response : [])
      } catch (error) {
        console.error('Error loading provider capabilities:', error)
        if (alive) setCapabilities([])
      }
    }

    loadCapabilities()

    return () => {
      alive = false
    }
  }, [])

  const capabilityMap = useMemo(() => {
    const map = {}
    capabilities.forEach((item) => {
      const provider = String(item?.provider || '').trim().toLowerCase()
      if (!provider) return
      map[provider] = {
        provider,
        status: item?.status || 'unknown',
        features: item?.features || {},
      }
    })
    return map
  }, [capabilities])

  const readyProviders = useMemo(
    () => Object.values(capabilityMap).filter((item) => item.status === 'ready').map((item) => item.provider),
    [capabilityMap],
  )

  const getCapability = (provider) => {
    const key = String(provider || 'aws').trim().toLowerCase() || 'aws'
    return capabilityMap[key] || { ...EMPTY_CAPABILITY, provider: key }
  }

  return {
    capabilities,
    capabilityMap,
    readyProviders,
    getCapability,
  }
}
