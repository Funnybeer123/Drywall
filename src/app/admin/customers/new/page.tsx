import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, PageHeader } from '@/components/ui'
import { CustomerFields } from '../customer-fields'
import { createCustomer } from '../actions'

export const metadata: Metadata = { title: 'New customer' }

export default async function NewCustomerPage() {
  await requireUser('customers:manage')
  return (
    <>
      <PageHeader back={{ href: '/admin/customers', label: 'Customers' }} title="New customer" />
      <Card className="max-w-3xl p-5">
        <ActionForm action={createCustomer}>
          <CustomerFields />
          <div className="mt-5">
            <SubmitButton>Create customer</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </>
  )
}
