import type { Project } from '../types'
import { resolveExpenseTax, vatModeLabel, type VatMode } from './vat'

export interface SalesInvoiceRow {
  projectId: string
  projectName: string
  client: string
  paymentId: string
  label: string
  amount: number
  paidDate: string
  invoiceIssued: boolean
  invoiceDate: string
}

export interface PurchaseInvoiceRow {
  projectId: string
  projectName: string
  expenseId: string
  title: string
  vendor: string
  date: string
  total: number
  supply: number
  vat: number
  vatMode: VatMode
  vatModeLabel: string
  invoiceReceived: boolean
}

export interface PortfolioTaxSummary {
  salesUnissued: SalesInvoiceRow[]
  salesUnissuedCount: number
  salesUnissuedAmount: number
  salesIssuedCount: number
  purchaseUnreceived: PurchaseInvoiceRow[]
  purchaseUnreceivedCount: number
  purchaseUnreceivedTotal: number
  purchaseUnreceivedVat: number
  purchaseReceivedCount: number
  totalSupply: number
  totalVat: number
  totalExpenseAmount: number
  vatByMode: Record<
    VatMode,
    { count: number; supply: number; vat: number; total: number }
  >
  attentionCount: number
}

const EMPTY_VAT_MODE = {
  included: { count: 0, supply: 0, vat: 0, total: 0 },
  separate: { count: 0, supply: 0, vat: 0, total: 0 },
  exempt: { count: 0, supply: 0, vat: 0, total: 0 },
}

export function getPortfolioTaxSummary(projects: Project[]): PortfolioTaxSummary {
  const salesUnissued: SalesInvoiceRow[] = []
  const purchaseUnreceived: PurchaseInvoiceRow[] = []
  let salesUnissuedAmount = 0
  let salesIssuedCount = 0
  let purchaseUnreceivedTotal = 0
  let purchaseUnreceivedVat = 0
  let purchaseReceivedCount = 0
  let totalSupply = 0
  let totalVat = 0
  let totalExpenseAmount = 0
  const vatByMode = structuredClone(EMPTY_VAT_MODE)

  for (const p of projects) {
    for (const cp of p.clientPayments) {
      if (!cp.isPaid) continue
      const row: SalesInvoiceRow = {
        projectId: p.id,
        projectName: p.name,
        client: p.client,
        paymentId: cp.id,
        label: cp.label,
        amount: cp.amount,
        paidDate: cp.paidDate,
        invoiceIssued: cp.invoiceIssued ?? false,
        invoiceDate: cp.invoiceDate ?? '',
      }
      if (row.invoiceIssued) {
        salesIssuedCount += 1
      } else {
        salesUnissued.push(row)
        salesUnissuedAmount += cp.amount
      }
    }

    for (const e of p.expenses) {
      const tax = resolveExpenseTax(e)
      const mode = tax.mode
      totalSupply += tax.supply
      totalVat += tax.vat
      totalExpenseAmount += tax.total
      vatByMode[mode].count += 1
      vatByMode[mode].supply += tax.supply
      vatByMode[mode].vat += tax.vat
      vatByMode[mode].total += tax.total

      const purchaseRow: PurchaseInvoiceRow = {
        projectId: p.id,
        projectName: p.name,
        expenseId: e.id,
        title: e.title,
        vendor: e.vendor,
        date: e.date,
        total: tax.total,
        supply: tax.supply,
        vat: tax.vat,
        vatMode: mode,
        vatModeLabel: vatModeLabel(mode),
        invoiceReceived: e.invoiceReceived ?? false,
      }

      if (purchaseRow.invoiceReceived) {
        purchaseReceivedCount += 1
      } else {
        purchaseUnreceived.push(purchaseRow)
        purchaseUnreceivedTotal += tax.total
        purchaseUnreceivedVat += tax.vat
      }
    }
  }

  salesUnissued.sort((a, b) => b.paidDate.localeCompare(a.paidDate))
  purchaseUnreceived.sort((a, b) => b.date.localeCompare(a.date))

  const salesUnissuedCount = salesUnissued.length
  const purchaseUnreceivedCount = purchaseUnreceived.length

  return {
    salesUnissued,
    salesUnissuedCount,
    salesUnissuedAmount,
    salesIssuedCount,
    purchaseUnreceived,
    purchaseUnreceivedCount,
    purchaseUnreceivedTotal,
    purchaseUnreceivedVat,
    purchaseReceivedCount,
    totalSupply,
    totalVat,
    totalExpenseAmount,
    vatByMode,
    attentionCount: salesUnissuedCount + purchaseUnreceivedCount,
  }
}
