import { Liability } from '../../types/liability/liability'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 负债表
 * @returns 创建负债表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS liabilities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          principal REAL NOT NULL,
          remaining_principal REAL NOT NULL,
          remaining_total_interest REAL DEFAULT 0,
          is_interest INTEGER DEFAULT 1,
          interest_rate REAL DEFAULT 0,
          start_date TEXT NOT NULL,
          repayment_method TEXT NOT NULL,
          repayment_day INTEGER,
          period INTEGER,
          account_id TEXT,
          remark TEXT,
          status TEXT DEFAULT '未结清',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_liabilities_account_id ON liabilities(account_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_liabilities_status ON liabilities(status)' }
  ]
}

const insert = (liability: Liability) => {
  return {
    statement: `
      INSERT INTO liabilities (id, name, type, principal, remaining_principal, remaining_total_interest, is_interest, interest_rate, start_date, repayment_method, repayment_day, period, account_id, remark, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      liability.id || generateId(),
      liability.name,
      liability.type,
      Amount.format(liability.principal || 0, 2),
      Amount.format(liability.remaining_principal || 0, 2),
      Amount.format(liability.remaining_total_interest || 0, 2),
      liability.is_interest ? 1 : 0,
      Amount.format(liability.interest_rate || 0, 4),
      formatForDB(liability.start_date || getCurrentDate()),
      liability.repayment_method,
      liability.repayment_day,
      liability.period,
      liability.account_id,
      liability.remark,
      liability.status || '未结清',
      formatForDB(liability.created_at || getCurrentDate()),
      formatForDB(liability.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM liabilities WHERE id = ?`,
    values: [id]
  }
}

const update = (liability: Liability) => {
  let values: any[] = []
  const fields: string[] = []

  if (liability.name) {
    fields.push('name = ?')
    values.push(liability.name)
  }
  if (liability.type) {
    fields.push('type = ?')
    values.push(liability.type)
  }
  if (liability.principal !== undefined && liability.principal !== null) {
    fields.push('principal = ?')
    values.push(Amount.format(liability.principal || 0, 2))
  }
  if (liability.remaining_principal !== undefined && liability.remaining_principal !== null) {
    fields.push('remaining_principal = ?')
    values.push(Amount.format(liability.remaining_principal || 0, 2))
  }
  if (liability.remaining_total_interest !== undefined && liability.remaining_total_interest !== null) {
    fields.push('remaining_total_interest = ?')
    values.push(Amount.format(liability.remaining_total_interest || 0, 2))
  }
  if (liability.is_interest !== undefined && liability.is_interest !== null) {
    fields.push('is_interest = ?')
    values.push(liability.is_interest ? 1 : 0)
  }
  if (liability.interest_rate !== undefined && liability.interest_rate !== null) {
    fields.push('interest_rate = ?')
    values.push(Amount.format(liability.interest_rate || 0, 4))
  }
  if (liability.start_date) {
    fields.push('start_date = ?')
    values.push(formatForDB(liability.start_date))
  }
  if (liability.repayment_method) {
    fields.push('repayment_method = ?')
    values.push(liability.repayment_method)
  }
  if (liability.repayment_day !== undefined) {
    fields.push('repayment_day = ?')
    values.push(liability.repayment_day)
  }
  if (liability.period !== undefined) {
    fields.push('period = ?')
    values.push(liability.period)
  }
  if (liability.account_id) {
    fields.push('account_id = ?')
    values.push(liability.account_id)
  }
  if (liability.remark !== undefined) {
    fields.push('remark = ?')
    values.push(liability.remark)
  }
  if (liability.status) {
    fields.push('status = ?')
    values.push(liability.status)
  }

  fields.push('updated_at = ?')
  values.push(formatForDB(liability.updated_at || getCurrentDate()))
  const statement = `UPDATE liabilities SET ${fields.join(', ')} WHERE id = ?`
  values.push(liability.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM liabilities WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as Liability : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM liabilities')
  return rows as Liability[]
}

export default { createTable, insert, del, update, queryById, queryAll }
