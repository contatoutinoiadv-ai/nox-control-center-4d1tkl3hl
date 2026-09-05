/**
 * Hook reativo de tarefas operacionais do CENTRAL NOX.
 * Consome taskService e sincroniza com o backend.
 */

import { useState, useEffect, useCallback } from 'react'
import { SentinelaTask } from '@/types/sentinela'
import { taskService } from '@/services/tasks/TaskService'
import { dataStore } from '@/services/dataStore'

export function useTasks() {
  const [tasks, setTasks] = useState<SentinelaTask[]>(() => dataStore.getTasks())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await taskService.listTasks()
    if (result.success && result.data) {
      setTasks(result.data)
    } else if (result.error) {
      setError(result.error.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Fonte única de reatividade do estado canônico de tarefas operacionais (dataStore facade)
    const unsubStore = dataStore.subscribe(() => {
      setTasks(dataStore.getTasks())
    })
    return () => {
      unsubStore()
    }
  }, [])

  const addTask = useCallback((task: SentinelaTask) => {
    dataStore.addTask(task)
  }, [])

  const updateTask = useCallback((id: string, updates: Partial<SentinelaTask>) => {
    return dataStore.updateTask(id, updates)
  }, [])

  const deleteTask = useCallback(async (id: string, actor?: string) => {
    return dataStore.deleteTask(id, actor)
  }, [])

  const toggleSubtask = useCallback((taskId: string, subtaskId: string, actor?: string) => {
    return dataStore.toggleSubtask(taskId, subtaskId, actor)
  }, [])

  return {
    tasks,
    loading,
    error,
    reload,
    addTask,
    updateTask,
    deleteTask,
    toggleSubtask,
  }
}
