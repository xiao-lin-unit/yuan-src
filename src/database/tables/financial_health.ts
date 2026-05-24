import { FinancialHealth } from '../../types/financial/health'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'

/**
 * 财务健康报告表
 * @returns 创建财务健康报告表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS financial_health (
          id TEXT PRIMARY KEY,
          liabilities_income_ratio REAL,
          emergency_fund_ratio REAL,
          asset_liability_ratio REAL,
          savings_rate REAL,
          net_asset_growth REAL,
          total_score INTEGER,
          report_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ]
}

const insert = (health: FinancialHealth) => {
  return {
    statement: `
      INSERT INTO financial_health (id, liabilities_income_ratio, emergency_fund_ratio, asset_liability_ratio, savings_rate, net_asset_growth, total_score, report_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      health.id || generateId(),
      health.liabilities_income_ratio,
      health.emergency_fund_ratio,
      health.asset_liability_ratio,
      health.savings_rate,
      health.net_asset_growth,
      health.total_score,
      formatForDB(health.report_date || getCurrentDate()),
      formatForDB(health.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM financial_health WHERE id = ?`,
    values: [id]
  }
}

const update = (health: FinancialHealth) => {
  let values: any[] = []
  const fields: string[] = []

  if (health.liabilities_income_ratio !== undefined) {
    fields.push('liabilities_income_ratio = ?')
    values.push(health.liabilities_income_ratio)
  }
  if (health.emergency_fund_ratio !== undefined) {
    fields.push('emergency_fund_ratio = ?')
    values.push(health.emergency_fund_ratio)
  }
  if (health.asset_liability_ratio !== undefined) {
    fields.push('asset_liability_ratio = ?')
    values.push(health.asset_liability_ratio)
  }
  if (health.savings_rate !== undefined) {
    fields.push('savings_rate = ?')
    values.push(health.savings_rate)
  }
  if (health.net_asset_growth !== undefined) {
    fields.push('net_asset_growth = ?')
    values.push(health.net_asset_growth)
  }
  if (health.total_score !== undefined) {
    fields.push('total_score = ?')
    values.push(health.total_score)
  }
  if (health.report_date) {
    fields.push('report_date = ?')
    values.push(formatForDB(health.report_date))
  }

  const statement = `UPDATE financial_health SET ${fields.join(', ')} WHERE id = ?`
  values.push(health.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM financial_health WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as FinancialHealth : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM financial_health')
  return rows as FinancialHealth[]
}

export default { createTable, insert, del, update, queryById, queryAll }
