import type dayjs from 'dayjs'

/**
 * General asset type definitions
 */

// Base asset interface
export interface Asset {
  id: string
  type: string
  name: string
  amount: number
  account_id: string
  period?: string
  period_count?: number
  income_date?: dayjs.Dayjs | string
  next_income_date?: dayjs.Dayjs | string
  calculation_type?: '无' | '按金额计算' | '按年收益率计算'
  income_amount: number
  annual_yield_rate: number
  status: string
  created_at?: dayjs.Dayjs | string
  updated_at?: dayjs.Dayjs | string
}

// Asset income record
export interface AssetIncomeRecord {
  id: string
  asset_id: string
  income_amount: number
  record_time: dayjs.Dayjs | string
  remark?: string
  created_at?: string
}

// Monthly asset snapshot
export interface AssetMonthlySnapshot {
  id: string
  year: number
  month: number
  total_assets: number
  total_liabilities: number
  net_worth: number
  confirmed_profit_stocks: number
  confirmed_profit_funds: number
  created_at?: dayjs.Dayjs | string
}

// Input for adding a new asset
export interface AssetInput {
  type: string
  name: string
  amount: number
  account_id: string
  period?: string
  period_count?: number
  income_date?: string
  calculation_type?: '无' | '按金额计算' | '按年收益率计算'
  income_amount?: number
  annual_yield_rate?: number
  next_income_date?: string
}
