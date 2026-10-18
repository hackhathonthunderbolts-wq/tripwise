import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/services/storage/localStore'
import {
  sanitizeBudget,
  sanitizeExpenses,
  sanitizeStops,
  sanitizeTripMeta,
} from '@/services/storage/schemas'
import {
  calculateProgress,
  hasPlace,
  moveBy,
  reorder,
  type TripProgress,
} from '@/services/itinerary/calculations'
import { calculateBudget, type BudgetSummary } from '@/services/budget/calculations'
import { categoryCost, categoryVisitMinutes, CURRENCY_CODE } from '@/lib/categories'
import { uid } from '@/lib/utils'
import { useToast } from '@/store/ToastStore'
import type {
  BudgetSettings,
  Expense,
  ItineraryStop,
  Place,
  StopStatus,
  TripMeta,
} from '@/types'

export interface AddStopResult {
  added: boolean
  message: string
}

interface TripContextValue {
  stops: ItineraryStop[]
  expenses: Expense[]
  budget: BudgetSettings
  meta: TripMeta
  progress: TripProgress
  summary: BudgetSummary
  storageIssue: string | null
  hasPlace: (placeId: string) => boolean
  addStop: (place: Place, options?: Partial<Pick<ItineraryStop, 'estimatedDurationMin' | 'estimatedCost' | 'day' | 'note'>>) => AddStopResult
  updateStop: (id: string, patch: Partial<ItineraryStop>) => void
  setStatus: (id: string, status: StopStatus) => void
  removeStop: (id: string) => void
  moveStop: (id: string, direction: -1 | 1) => void
  reorderStops: (from: number, to: number) => void
  clearStops: () => void
  addExpense: (input: Omit<Expense, 'id' | 'createdAt'>) => void
  updateExpense: (id: string, patch: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  setBudget: (patch: Partial<BudgetSettings>) => void
  setMeta: (patch: Partial<TripMeta>) => void
}

const TripContext = createContext<TripContextValue | null>(null)

const DEFAULT_BUDGET: BudgetSettings = { total: 0, daily: null, currency: CURRENCY_CODE }
const DEFAULT_META: TripMeta = { name: 'My trip' }

export function TripProvider({ children }: { children: ReactNode }) {
  const { push } = useToast()
  const [stops, setStops] = useState<ItineraryStop[]>(() => loadJSON(STORAGE_KEYS.itinerary, [], sanitizeStops))
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadJSON(STORAGE_KEYS.expenses, [], sanitizeExpenses),
  )
  const [budget, setBudgetState] = useState<BudgetSettings>(() =>
    loadJSON(STORAGE_KEYS.budget, DEFAULT_BUDGET, sanitizeBudget),
  )
  const [meta, setMetaState] = useState<TripMeta>(() =>
    loadJSON(STORAGE_KEYS.tripMeta, DEFAULT_META, sanitizeTripMeta),
  )
  const [storageIssue, setStorageIssue] = useState<string | null>(null)

  const persist = useCallback((key: string, value: unknown) => {
    const result = saveJSON(key, value)
    setStorageIssue(result.ok ? null : (result.error ?? 'Changes could not be saved.'))
  }, [])

  useEffect(() => persist(STORAGE_KEYS.itinerary, stops), [stops, persist])
  useEffect(() => persist(STORAGE_KEYS.expenses, expenses), [expenses, persist])
  useEffect(() => persist(STORAGE_KEYS.budget, budget), [budget, persist])
  useEffect(() => persist(STORAGE_KEYS.tripMeta, meta), [meta, persist])

  const placeExists = useCallback((placeId: string) => hasPlace(stops, placeId), [stops])

  const addStop = useCallback<TripContextValue['addStop']>(
    (place, options = {}) => {
      if (hasPlace(stops, place.id)) {
        return { added: false, message: `${place.name} is already in your trip.` }
      }
      const stop: ItineraryStop = {
        id: uid('stop'),
        place,
        status: 'planned',
        estimatedDurationMin:
          options.estimatedDurationMin ?? categoryVisitMinutes(place.category),
        estimatedCost: options.estimatedCost ?? categoryCost(place.category),
        day: options.day,
        note: options.note,
        createdAt: new Date().toISOString(),
      }
      setStops((current) =>
        hasPlace(current, place.id) ? current : [...current, stop],
      )
      return { added: true, message: `${place.name} added to your trip.` }
    },
    [stops],
  )

  const updateStop = useCallback<TripContextValue['updateStop']>((id, patch) => {
    setStops((current) =>
      current.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)),
    )
  }, [])

  const setStatus = useCallback<TripContextValue['setStatus']>((id, status) => {
    setStops((current) =>
      current.map((stop) =>
        stop.id === id
          ? {
              ...stop,
              status,
              visitedAt:
                status === 'visited'
                  ? (stop.visitedAt ?? new Date().toISOString())
                  : undefined,
            }
          : stop,
      ),
    )
  }, [])

  const removeStop = useCallback<TripContextValue['removeStop']>((id) => {
    setStops((current) => current.filter((stop) => stop.id !== id))
  }, [])

  const moveStop = useCallback<TripContextValue['moveStop']>((id, direction) => {
    setStops((current) => {
      const index = current.findIndex((stop) => stop.id === id)
      if (index === -1) return current
      return moveBy(current, index, direction)
    })
  }, [])

  const reorderStops = useCallback<TripContextValue['reorderStops']>((from, to) => {
    setStops((current) => reorder(current, from, to))
  }, [])

  const clearStops = useCallback(() => setStops([]), [])

  const addExpense = useCallback<TripContextValue['addExpense']>((input) => {
    setExpenses((current) => [
      ...current,
      { ...input, id: uid('exp'), createdAt: new Date().toISOString() },
    ])
  }, [])

  const updateExpense = useCallback<TripContextValue['updateExpense']>((id, patch) => {
    setExpenses((current) =>
      current.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)),
    )
  }, [])

  const deleteExpense = useCallback<TripContextValue['deleteExpense']>((id) => {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
  }, [])

  const setBudget = useCallback<TripContextValue['setBudget']>((patch) => {
    setBudgetState((current) => ({ ...current, ...patch }))
  }, [])

  const setMeta = useCallback<TripContextValue['setMeta']>((patch) => {
    setMetaState((current) => ({ ...current, ...patch }))
  }, [])

  useEffect(() => {
    if (storageIssue) push(storageIssue, 'error')
  }, [storageIssue, push])

  const progress = useMemo(() => calculateProgress(stops), [stops])
  const summary = useMemo(() => calculateBudget(budget, expenses, stops), [budget, expenses, stops])

  const value = useMemo<TripContextValue>(
    () => ({
      stops,
      expenses,
      budget,
      meta,
      progress,
      summary,
      storageIssue,
      hasPlace: placeExists,
      addStop,
      updateStop,
      setStatus,
      removeStop,
      moveStop,
      reorderStops,
      clearStops,
      addExpense,
      updateExpense,
      deleteExpense,
      setBudget,
      setMeta,
    }),
    [
      stops,
      expenses,
      budget,
      meta,
      progress,
      summary,
      storageIssue,
      placeExists,
      addStop,
      updateStop,
      setStatus,
      removeStop,
      moveStop,
      reorderStops,
      clearStops,
      addExpense,
      updateExpense,
      deleteExpense,
      setBudget,
      setMeta,
    ],
  )

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export function useTrip(): TripContextValue {
  const context = useContext(TripContext)
  if (!context) throw new Error('useTrip must be used inside <TripProvider>')
  return context
}
