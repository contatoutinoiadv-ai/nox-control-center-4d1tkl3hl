/**
 * Hook reativo de clientes do CENTRAL NOX.
 * Consome clientService e atualiza a interface via realtime SSE ou mutacoes locais.
 */

import { useState, useEffect, useCallback } from 'react'
import { NoxClient, ClientStage } from '@/types/nox'
import { clientService } from '@/services/clients/ClientService'
import { dataStore } from '@/services/dataStore'

export function useClients() {
  const [clients, setClients] = useState<NoxClient[]>(() => dataStore.getClients())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await clientService.listClients()
    if (result.success && result.data) {
      setClients(result.data)
    } else if (result.error) {
      setError(result.error.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Sincroniza com mudancas reativas do dataStore facade
    const unsubStore = dataStore.subscribe(() => {
      setClients(dataStore.getClients())
    })

    // Sincroniza com realtime nativo do PocketBaseClientRepository
    const unsubRepo = clientService.subscribe(() => {
      setClients(dataStore.getClients())
    })

    return () => {
      unsubStore()
      unsubRepo()
    }
  }, [])

  const addClient = useCallback(async (client: Partial<NoxClient>) => {
    return dataStore.addClient(client as any)
  }, [])

  const updateClient = useCallback(
    async (id: string, updates: Partial<NoxClient>, actor?: string) => {
      return dataStore.updateClient(id, updates, actor)
    },
    [],
  )

  const updateStage = useCallback(async (id: string, newStage: ClientStage, actor?: string) => {
    return dataStore.updateClientStage(id, newStage, actor)
  }, [])

  const deleteClient = useCallback(async (id: string, actor?: string) => {
    return dataStore.deleteClient(id, actor)
  }, [])

  return {
    clients,
    loading,
    error,
    reload,
    addClient,
    updateClient,
    updateStage,
    deleteClient,
  }
}
