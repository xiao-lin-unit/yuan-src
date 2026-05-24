import { SandboxResult } from '../../types/sandbox/sandbox'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 沙盘推演结果表
 * @returns 创建沙盘推演结果表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS sandbox_result (
          id TEXT PRIMARY KEY NOT NULL,
          history_id TEXT NOT NULL,
          net_assets REAL,
          net_assets_change TEXT,
          cash_flow_monthly REAL,
          cash_flow_change TEXT,
          debt_pressure_level INTEGER,
          debt_pressure_desc TEXT,
          survival_months INTEGER,
          interest_save REAL,
          monthly_payment_change REAL,
          total_interest_change REAL,
          chart_x TEXT NOT NULL,
          chart_net_assets TEXT NOT NULL,
          chart_cash_flow TEXT NOT NULL,
          chart_debt TEXT NOT NULL,
          conclusion TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_sandbox_result_history_id ON sandbox_result(history_id)' }
  ]
}

const insert = (result: SandboxResult) => {
  return {
    statement: `
      INSERT INTO sandbox_result (id, history_id, net_assets, net_assets_change, cash_flow_monthly, cash_flow_change, debt_pressure_level, debt_pressure_desc, survival_months, interest_save, monthly_payment_change, total_interest_change, chart_x, chart_net_assets, chart_cash_flow, chart_debt, conclusion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      result.id || generateId(),
      result.history_id,
      result.net_assets !== undefined && result.net_assets !== null ? Amount.format(result.net_assets, 2) : null,
      result.net_assets_change,
      result.cash_flow_monthly !== undefined && result.cash_flow_monthly !== null ? Amount.format(result.cash_flow_monthly, 2) : null,
      result.cash_flow_change,
      result.debt_pressure_level,
      result.debt_pressure_desc,
      result.survival_months,
      result.interest_save !== undefined && result.interest_save !== null ? Amount.format(result.interest_save, 2) : null,
      result.monthly_payment_change !== undefined && result.monthly_payment_change !== null ? Amount.format(result.monthly_payment_change, 2) : null,
      result.total_interest_change !== undefined && result.total_interest_change !== null ? Amount.format(result.total_interest_change, 2) : null,
      result.chart_x,
      result.chart_net_assets,
      result.chart_cash_flow,
      result.chart_debt,
      result.conclusion,
      formatForDB(result.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM sandbox_result WHERE id = ?`,
    values: [id]
  }
}

const update = (result: SandboxResult) => {
  let values: any[] = []
  const fields: string[] = []

  if (result.history_id) {
    fields.push('history_id = ?')
    values.push(result.history_id)
  }
  if (result.net_assets !== undefined) {
    fields.push('net_assets = ?')
    values.push(result.net_assets !== null ? Amount.format(result.net_assets, 2) : null)
  }
  if (result.net_assets_change !== undefined) {
    fields.push('net_assets_change = ?')
    values.push(result.net_assets_change)
  }
  if (result.cash_flow_monthly !== undefined) {
    fields.push('cash_flow_monthly = ?')
    values.push(result.cash_flow_monthly !== null ? Amount.format(result.cash_flow_monthly, 2) : null)
  }
  if (result.cash_flow_change !== undefined) {
    fields.push('cash_flow_change = ?')
    values.push(result.cash_flow_change)
  }
  if (result.debt_pressure_level !== undefined) {
    fields.push('debt_pressure_level = ?')
    values.push(result.debt_pressure_level)
  }
  if (result.debt_pressure_desc !== undefined) {
    fields.push('debt_pressure_desc = ?')
    values.push(result.debt_pressure_desc)
  }
  if (result.survival_months !== undefined) {
    fields.push('survival_months = ?')
    values.push(result.survival_months)
  }
  if (result.interest_save !== undefined) {
    fields.push('interest_save = ?')
    values.push(result.interest_save !== null ? Amount.format(result.interest_save, 2) : null)
  }
  if (result.monthly_payment_change !== undefined) {
    fields.push('monthly_payment_change = ?')
    values.push(result.monthly_payment_change !== null ? Amount.format(result.monthly_payment_change, 2) : null)
  }
  if (result.total_interest_change !== undefined) {
    fields.push('total_interest_change = ?')
    values.push(result.total_interest_change !== null ? Amount.format(result.total_interest_change, 2) : null)
  }
  if (result.chart_x !== undefined) {
    fields.push('chart_x = ?')
    values.push(result.chart_x)
  }
  if (result.chart_net_assets !== undefined) {
    fields.push('chart_net_assets = ?')
    values.push(result.chart_net_assets)
  }
  if (result.chart_cash_flow !== undefined) {
    fields.push('chart_cash_flow = ?')
    values.push(result.chart_cash_flow)
  }
  if (result.chart_debt !== undefined) {
    fields.push('chart_debt = ?')
    values.push(result.chart_debt)
  }
  if (result.conclusion !== undefined) {
    fields.push('conclusion = ?')
    values.push(result.conclusion)
  }

  const statement = `UPDATE sandbox_result SET ${fields.join(', ')} WHERE id = ?`
  values.push(result.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM sandbox_result WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as SandboxResult : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM sandbox_result')
  return rows as SandboxResult[]
}

export default { createTable, insert, del, update, queryById, queryAll }
