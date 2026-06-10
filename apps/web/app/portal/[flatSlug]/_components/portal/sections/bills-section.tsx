'use client'

import { CreditCard, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { PortalRenterData } from '../../types'

interface BillsSectionProps {
  portalData: PortalRenterData
}

export function BillsSection({ portalData }: BillsSectionProps) {
  const { t } = useTranslation()
  const { bills, payments } = portalData

  return (
    <div className="flex flex-col gap-6">
      {/* Bill History List */}
      <Card className="bg-canvas border border-hairline rounded-xl">
        <CardHeader className="pb-3 border-b border-hairline-soft">
          <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {t('bills.title') || 'বিল ইতিহাস'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <p className="text-sm text-steel text-center py-8">
              {t('bills.noBills') || 'কোনো বিল পাওয়া যায়নি'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface">
                    <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-30">
                      {t('bills.billMonth') || 'বিলিং মাস'}
                    </th>
                    <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-25">
                      {t('bills.status') || 'অবস্থা'}
                    </th>
                    <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase">
                      {t('bills.totalAmount') || 'মোট পরিমাণ'}
                    </th>
                    <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase">
                      {t('bills.paidAmount') || 'পরিশোধিত পরিমাণ'}
                    </th>
                    <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase w-30">
                      {t('deposits.outstanding') || 'বকেয়া'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => {
                    const statusLabel =
                      bill.status === 'paid'
                        ? t('bills.paid') || 'পরিশোধিত'
                        : bill.status === 'partially_paid'
                          ? t('bills.partiallyPaid') || 'আংশিক পরিশোধিত'
                          : bill.status === 'overdue'
                            ? t('bills.overdue') || 'বকেয়া'
                            : t('bills.unpaid') || 'অপরিশোধিত'
                    const statusColor =
                      bill.status === 'paid'
                        ? 'bg-success-bg text-success-text border-success-text/20'
                        : bill.status === 'partially_paid'
                          ? 'bg-info-bg text-info-text border-info-text/20'
                          : 'bg-error-bg text-error-text border-error-text/20'
                    return (
                      <tr
                        key={bill.id}
                        className="border-b border-hairline-soft hover:bg-surface/30"
                      >
                        <td className="px-5 py-3.5 font-semibold text-ink">
                          {bill.billingMonth}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              'text-xs px-2.5 py-0.5 rounded-full border font-medium',
                              statusColor,
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-ink">
                          ৳
                          {bill.totalAmount.toLocaleString('en-BD', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right text-success-text">
                          ৳
                          {bill.paidAmount.toLocaleString('en-BD', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-error-text">
                          ৳
                          {(bill.totalAmount - bill.paidAmount).toLocaleString(
                            'en-BD',
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History List */}
      <Card className="bg-canvas border border-hairline rounded-xl">
        <CardHeader className="pb-3 border-b border-hairline-soft">
          <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            {t('payments.title') || 'পেমেন্ট ইতিহাস'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-steel text-center py-8">
              {t('payments.noPayments') || 'কোনো পেমেন্ট পাওয়া যায়নি'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface">
                    <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase">
                      {t('payments.receipt') || 'রসিদ নম্বর'}
                    </th>
                    <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-30">
                      {t('payments.date') || 'তারিখ'}
                    </th>
                    <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase w-30">
                      {t('payments.method') || 'পদ্ধতি'}
                    </th>
                    <th className="px-5 py-3.5 text-left font-semibold text-xs text-steel uppercase">
                      {t('payments.note') || 'নোট'}
                    </th>
                    <th className="px-5 py-3.5 text-right font-semibold text-xs text-steel uppercase w-35">
                      {t('payments.amount') || 'পরিমাণ'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pm) => {
                    const methodLabel =
                      pm.paymentMethod === 'cash'
                        ? t('payments.cash') || 'নগদ'
                        : pm.paymentMethod === 'bank_transfer'
                          ? t('payments.bankTransfer') || 'ব্যাংক ট্রান্সফার'
                          : pm.paymentMethod === 'mobile_banking'
                            ? t('payments.mobileBanking') || 'মোবাইল ব্যাংকিং'
                            : pm.paymentMethod
                    return (
                      <tr
                        key={pm.id}
                        className="border-b border-hairline-soft hover:bg-surface/30"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-brand-blue-deep font-semibold">
                          {pm.receiptReference}
                        </td>
                        <td className="px-5 py-3.5 text-steel text-xs">
                          {pm.paymentDate}
                        </td>
                        <td className="px-5 py-3.5 text-ink">{methodLabel}</td>
                        <td className="px-5 py-3.5 text-steel italic text-xs">
                          {pm.note || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-success-text">
                          ৳
                          {pm.amount.toLocaleString('en-BD', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
