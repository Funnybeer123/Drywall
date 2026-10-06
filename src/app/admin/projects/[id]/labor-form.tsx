'use client'

import { useState } from 'react'
import type { ActionState } from '@/lib/action-state'
import { ActionForm, SubmitButton } from '@/components/form'
import { Field, Input, Select } from '@/components/ui'

type Worker = { id: number; name: string; payRateCents?: number }

/**
 * Add a labor entry. Picking a team member fills in their pay rate (owner only —
 * managers never receive rates, and the server uses the member's rate for them).
 */
export function LaborForm({
  action,
  workers,
  showRates,
  today,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>
  workers: Worker[]
  showRates: boolean
  today: string
}) {
  const [userId, setUserId] = useState<string>(workers[0] ? String(workers[0].id) : '')
  const selected = workers.find((w) => String(w.id) === userId)
  const [rate, setRate] = useState<string>(selected?.payRateCents ? (selected.payRateCents / 100).toFixed(2) : '')
  const other = userId === ''

  return (
    <ActionForm action={action} resetOnSuccess className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <Field label="Worker" htmlFor="labor-user" className="col-span-2">
        <Select
          id="labor-user"
          name="userId"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value)
            const w = workers.find((x) => String(x.id) === e.target.value)
            setRate(w?.payRateCents ? (w.payRateCents / 100).toFixed(2) : '')
          }}
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          <option value="">Other / subcontractor…</option>
        </Select>
      </Field>
      {other ? (
        <Field label="Name" htmlFor="labor-name" className="col-span-2">
          <Input id="labor-name" name="workerName" required placeholder="Worker or sub name" />
        </Field>
      ) : null}
      <Field label="Date" htmlFor="labor-date" className={other ? 'col-span-2' : 'col-span-1 sm:col-span-2'}>
        <Input id="labor-date" name="date" type="date" required defaultValue={today} />
      </Field>
      <Field label="Hours" htmlFor="labor-hours" className="col-span-1">
        <Input id="labor-hours" name="hours" inputMode="decimal" required placeholder="8" />
      </Field>
      {showRates || other ? (
        <Field label="Rate $/hr" htmlFor="labor-rate" className="col-span-1">
          <Input id="labor-rate" name="rate" inputMode="decimal" required={other} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" />
        </Field>
      ) : null}
      <Field label="Note" htmlFor="labor-note" className="col-span-2 sm:col-span-4">
        <Input id="labor-note" name="note" placeholder="Optional" />
      </Field>
      <div className="col-span-2 flex items-end">
        <SubmitButton variant="secondary" className="w-full">
          Add labor
        </SubmitButton>
      </div>
    </ActionForm>
  )
}
