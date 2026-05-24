/**
 * Financial health type definitions
 */

// Financial health report record
export interface FinancialHealth {
  id: string
  liabilities_income_ratio: number | null
  emergency_fund_ratio: number | null
  asset_liability_ratio: number | null
  savings_rate: number | null
  net_asset_growth: number | null
  total_score: number | null
  report_date: string
  created_at?: string
}
