import { useMemo, useState } from 'react'
import {
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/States'
import { CategoryDonut, DailySpendChart } from '@/components/budget/Charts'
import { useTrip } from '@/store/TripStore'
import { useToast } from '@/store/ToastStore'
import { EXPENSE_LABELS, budgetAdvice } from '@/services/budget/calculations'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { Expense, ExpenseCategory } from '@/types'

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  'attraction',
  'accommodation',
  'food',
  'transport',
  'shopping',
  'misc',
]

interface ExpenseDraft {
  amount: string
  category: ExpenseCategory
  date: string
  note: string
  stopId: string
}

const EMPTY_DRAFT: ExpenseDraft = {
  amount: '',
  category: 'food',
  date: todayISO(),
  note: '',
  stopId: '',
}

export default function BudgetPage() {
  const { budget, setBudget, expenses, addExpense, updateExpense, deleteExpense, summary, stops } =
    useTrip()
  const { push } = useToast()

  const [totalInput, setTotalInput] = useState(budget.total ? String(budget.total) : '')
  const [dailyInput, setDailyInput] = useState(budget.daily ? String(budget.daily) : '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ExpenseDraft>(EMPTY_DRAFT)

  const advice = useMemo(() => budgetAdvice(summary), [summary])
  const stopOptions = useMemo(
    () => stops.filter((stop) => stop.status !== 'skipped'),
    [stops],
  )

  const trimmedTotal = totalInput.trim() === '' ? 0 : Math.max(0, Number(totalInput))
  const trimmedDaily = dailyInput.trim() === '' ? null : Math.max(0, Number(dailyInput))
  const budgetDirty =
    trimmedTotal !== budget.total || trimmedDaily !== (budget.daily ?? null)

  function saveBudget() {
    setBudget({
      total: Number.isFinite(trimmedTotal) ? trimmedTotal : 0,
      daily: trimmedDaily !== null && Number.isFinite(trimmedDaily) ? trimmedDaily : null,
    })
    push('Budget updated.', 'success')
  }

  function openAdd() {
    setEditingId(null)
    setDraft({ ...EMPTY_DRAFT, date: todayISO() })
    setModalOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id)
    setDraft({
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      note: expense.note ?? '',
      stopId: expense.stopId ?? '',
    })
    setModalOpen(true)
  }

  function submitDraft() {
    const amount = Number(draft.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      push('Enter an amount greater than zero.', 'error')
      return
    }
    if (!draft.date) {
      push('Pick a date for this expense.', 'error')
      return
    }
    const payload = {
      amount: Math.round(amount),
      category: draft.category,
      date: draft.date,
      note: draft.note.trim() || undefined,
      stopId: draft.stopId || undefined,
    }
    if (editingId) {
      updateExpense(editingId, payload)
      push('Expense updated.', 'success')
    } else {
      addExpense(payload)
      push('Expense added.', 'success')
    }
    setModalOpen(false)
  }

  const remainingTone =
    summary.status === 'over' ? 'clay' : summary.status === 'warning' ? 'gold' : 'forest'

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow="Budget tracker"
        title="Where the money goes"
        description="Set a total and per-day budget, log real spend, and TripWise compares it with the estimated costs already on your itinerary — estimates are never double counted against recorded expenses."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Budget settings + summary ----------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Your budget" description="All figures in INR (₹). Editable any time." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Total budget (₹)" htmlFor="budget-total">
                <Input
                  id="budget-total"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  placeholder="e.g. 20000"
                  value={totalInput}
                  onChange={(event) => setTotalInput(event.target.value)}
                />
              </Field>
              <Field label="Per-day cap (₹)" htmlFor="budget-daily" hint="Optional">
                <Input
                  id="budget-daily"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  placeholder="e.g. 3000"
                  value={dailyInput}
                  onChange={(event) => setDailyInput(event.target.value)}
                />
              </Field>
            </div>
            <Button
              className="mt-4 w-full justify-center"
              onClick={saveBudget}
              disabled={!budgetDirty}
              icon={<Wallet className="h-4 w-4" />}
            >
              Save budget
            </Button>
          </Card>

          <Card>
            <CardHeader
              title="Summary"
              action={<Badge tone={remainingTone}>{summary.status === 'over' ? 'Over' : summary.status === 'warning' ? 'Tight' : 'On track'}</Badge>}
            />
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Total budget" value={formatCurrency(summary.total)} />
              <SummaryRow label="Recorded spend" value={formatCurrency(summary.spent)} />
              <SummaryRow
                label="Planned (not yet spent)"
                value={formatCurrency(summary.plannedEstimate)}
                hint="From itinerary estimates with no matching expense"
              />
              <SummaryRow label="Committed total" value={formatCurrency(summary.committed)} emphasis />
              <SummaryRow
                label="Remaining"
                value={formatCurrency(summary.remaining)}
                tone={summary.remaining < 0 ? 'clay' : 'forest'}
              />
            </dl>

            <div className="mt-5 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-charcoal-500">
                  <span>Spent</span>
                  <span>{Math.round(summary.percentUsed)}%</span>
                </div>
                <ProgressBar value={summary.percentUsed} tone={summary.status === 'over' ? 'clay' : 'forest'} label="Spent" showLabel={false} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-charcoal-500">
                  <span>Committed (spent + planned)</span>
                  <span>{Math.round(summary.percentCommitted)}%</span>
                </div>
                <ProgressBar value={summary.percentCommitted} tone={summary.status === 'over' ? 'clay' : remainingTone} label="Committed" showLabel={false} />
              </div>
            </div>

            {advice ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-600">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {advice}
              </p>
            ) : summary.total > 0 ? (
              <p className="mt-4 rounded-xl bg-forest-50 px-3 py-2 text-sm text-forest-700">
                ✓ You have {formatCurrency(summary.remaining)} of headroom left.
              </p>
            ) : (
              <p className="mt-4 rounded-xl bg-ivory-200 px-3 py-2 text-sm text-charcoal-600">
                Set a total budget above to see warnings and remaining headroom.
              </p>
            )}
          </Card>
        </div>

        {/* Charts + expenses ------------------------------------------ */}
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="By category" description="Recorded expenses only" />
              <div className="mt-4">
                <CategoryDonut rows={summary.byCategory} total={summary.spent} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Daily spend" />
              <div className="mt-4">
                <DailySpendChart rows={summary.daily} dailyBudget={budget.daily} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title={`Recorded expenses (${expenses.length})`}
              description="Spend you have actually paid for."
              action={
                <Button onClick={openAdd} icon={<Plus className="h-4 w-4" />} size="sm">
                  Add expense
                </Button>
              }
            />

            {expenses.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<Receipt className="h-6 w-6" />}
                  title="No expenses yet"
                  description="Log tickets, food, stays and transport here. Each entry can be linked to an itinerary stop so TripWise never counts its estimate twice."
                  action={<Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>Add your first expense</Button>}
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-sage-100">
                {expenses.map((expense) => {
                  const stop = expense.stopId
                    ? stops.find((candidate) => candidate.id === expense.stopId)
                    : undefined
                  return (
                    <li key={expense.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-charcoal-800">
                            {formatCurrency(expense.amount)}
                          </span>
                          <Badge tone="neutral">{EXPENSE_LABELS[expense.category]}</Badge>
                          {stop ? <Badge tone="forest">{stop.place.name}</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-charcoal-500">
                          {formatDate(expense.date)}
                          {expense.note ? ` · ${expense.note}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => openEdit(expense)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => {
                            deleteExpense(expense.id)
                            push('Expense deleted.', 'info')
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit expense' : 'Add expense'}
        description="Record what you actually paid. Amounts are stored in whole rupees."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitDraft}>{editingId ? 'Save changes' : 'Add expense'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (₹)" htmlFor="expense-amount" required>
            <Input
              id="expense-amount"
              data-autofocus
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={draft.amount}
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="expense-category">
              <Select
                id="expense-category"
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, category: event.target.value as ExpenseCategory }))
                }
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {EXPENSE_LABELS[category]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" htmlFor="expense-date">
              <Input
                id="expense-date"
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </Field>
          </div>
          <Field
            label="Linked itinerary stop"
            htmlFor="expense-stop"
            hint="Optional — prevents counting the stop's estimate twice"
          >
            <Select
              id="expense-stop"
              value={draft.stopId}
              onChange={(event) => setDraft((current) => ({ ...current, stopId: event.target.value }))}
            >
              <option value="">Not linked</option>
              {stopOptions.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.place.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note" htmlFor="expense-note" hint="Optional">
            <Textarea
              id="expense-note"
              rows={2}
              placeholder="e.g. Entry ticket, auto fare…"
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            />
          </Field>
        </div>
      </Modal>
    </PageContainer>
  )
}

function SummaryRow({
  label,
  value,
  hint,
  emphasis,
  tone,
}: {
  label: string
  value: string
  hint?: string
  emphasis?: boolean
  tone?: 'forest' | 'clay'
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-charcoal-600">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-charcoal-400">{hint}</span> : null}
      </dt>
      <dd
        className={[
          'text-right tabular-nums',
          emphasis ? 'font-semibold text-charcoal-900' : 'text-charcoal-800',
          tone === 'clay' ? '!text-clay-600' : tone === 'forest' ? '!text-forest-700' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
