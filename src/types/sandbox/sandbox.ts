/**
 * Sandbox simulation type definitions
 */

// Sandbox simulation history record
export interface SandboxHistory {
  id: string
  scene_type: number
  scene_name: string
  user_title?: string
  simulate_time: string
  params: string
  result_desc?: string
  created_at: string
  is_deleted: number
  remark?: string
}

// Sandbox simulation result record
export interface SandboxResult {
  id: string
  history_id: string
  net_assets?: number
  net_assets_change?: string
  cash_flow_monthly?: number
  cash_flow_change?: string
  debt_pressure_level?: number
  debt_pressure_desc?: string
  survival_months?: number
  interest_save?: number
  monthly_payment_change?: number
  total_interest_change?: number
  chart_x: string
  chart_net_assets: string
  chart_cash_flow: string
  chart_debt: string
  conclusion: string
  created_at: string
}
