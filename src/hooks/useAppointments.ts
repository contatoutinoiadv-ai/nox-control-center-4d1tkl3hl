/**
 * Hook reativo de compromissos e agenda do CENTRAL NOX.
 * Consome appointmentService e atualiza a interface via realtime.
 */

import { useState, useEffect, useCallback } from 'react'
import { AgendaEvent } from '@/types/sentinela'
import { appointmentService } from '@/services/appointments/AppointmentService'
import { dataStore } from '@/services/dataStore'

export function useAppointments() {
  const [events, setEvents] = useState<AgendaEvent[]>(() => dataStore.getAgendaEvents())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await appointmentService.listAppointments()
    if (result.success && result.data) {
      setEvents(result.data)
    } else if (result.error) {
      setError(result.error.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const unsubStore = dataStore.subscribe(() => {
      setEvents(dataStore.getAgendaEvents())
    })
    const unsubRepo = appointmentService.subscribe(() => {
      setEvents(dataStore.getAgendaEvents())
    })
    return () => {
      unsubStore()
      unsubRepo()
    }
  }, [])

  const addEvent = useCallback((event: AgendaEvent) => {
    dataStore.addAgendaEvent(event)
  }, [])

  const updateEvent = useCallback((id: string, updates: Partial<AgendaEvent>) => {
    return dataStore.updateAgendaEvent(id, updates)
  }, [])

  const deleteEvent = useCallback(async (id: string, actor?: string) => {
    return dataStore.deleteAgendaEvent(id, actor)
  }, [])

  const togglePreparacao = useCallback((id: string, habilitar?: boolean, actor?: string) => {
    return dataStore.togglePreparacaoAudiencia(id, habilitar, actor)
  }, [])

  return {
    events,
    loading,
    error,
    reload,
    addEvent,
    updateEvent,
    deleteEvent,
    togglePreparacao,
  }
}
