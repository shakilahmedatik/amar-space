'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useAdminDashboard, useAdminOwners } from '@/hooks/use-admin'
import { useTranslation } from '@/lib/i18n'

export function SuperadminDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAdminDashboard()
  const { data: ownersData } = useAdminOwners({
    status: 'pending',
    pageSize: 5,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <div
        role="alert"
        className="p-6 bg-error-bg rounded-lg border border-error-text text-center"
      >
        <p className="text-error-text mb-4">{t('dashboard.loadError')}</p>
        <Button
          type="button"
          onClick={() => refetch()}
          className="min-h-11 rounded-full bg-primary text-on-primary font-semibold"
        >
          {t('dashboard.retry')}
        </Button>
      </div>
    )
  }

  const pendingOwners = ownersData?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          label={t('dashboard.ownerAccounts')}
          value={String(data.usersByRole.owner)}
        />
        <StatCard
          label={t('dashboard.managerAccounts')}
          value={String(data.usersByRole.manager)}
        />
        <StatCard
          label={t('dashboard.pendingApprovals')}
          value={String(data.pendingApprovals)}
        />
        <StatCard
          label={t('dashboard.activeSessions')}
          value={String(data.activeSessions)}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Link href="/admin/owners">
          <Card className="bg-surface rounded-lg border border-hairline hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-steel mb-2">
                {t('dashboard.approveOwners')}
              </p>
              <p className="text-lg font-bold text-ink">
                {data.pendingApprovals}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="bg-surface rounded-lg border border-hairline hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-steel mb-2">
                {t('dashboard.manageUsers')}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/audit">
          <Card className="bg-surface rounded-lg border border-hairline hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-steel mb-2">
                {t('dashboard.viewAuditLog')}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-charcoal">
          {t('dashboard.recentPendingOwners')}
        </h2>
        {pendingOwners.length === 0 ? (
          <p className="text-steel text-sm">{t('dashboard.noPendingOwners')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingOwners.map((owner) => (
              <Card
                key={owner.id}
                className="bg-canvas rounded-xl border border-hairline p-6"
              >
                <CardContent className="p-0 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <p className="font-medium text-ink mb-1">{owner.name}</p>
                    <p className="text-xs text-steel">{owner.email}</p>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(owner.createdAt).toLocaleDateString('bn-BD')}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="bg-surface rounded-lg border border-hairline">
      <CardContent className="p-5">
        <p className="text-sm text-steel mb-2">{label}</p>
        <div className="text-2xl font-bold text-ink">{value}</div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {['owners', 'managers', 'pending', 'sessions'].map((id) => (
          <Card
            key={id}
            className="bg-surface rounded-lg border border-hairline"
          >
            <CardContent className="p-5">
              <LoadingSkeleton rows={2} rowHeight={16} showHeader={false} />
            </CardContent>
          </Card>
        ))}
      </div>
      <LoadingSkeleton rows={5} showHeader />
    </div>
  )
}
