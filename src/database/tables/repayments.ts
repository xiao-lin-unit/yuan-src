import { Repayment } from '../../types/liability/liability'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 还款记录表
 * @returns 创建还款记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS repayments (
          id TEXT PRIMARY KEY,
          liability_id TEXT NOT NULL,
          period_number INTEGER,
          amount REAL NOT NULL,
          principal_amount REAL DEFAULT 0,
          interest_amount REAL DEFAULT 0,
          type TEXT NOT NULL,
          remark TEXT,
          repayment_time TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_repayments_liability_id ON repayments(liability_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_repayments_repayment_time ON repayments(repayment_time)' }
  ]
}

const insert = (repayment: Repayment) => {
  return {
    statement: `
      INSERT INTO repayments (id, liability_id, period_number, amount, principal_amount, interest_amount, type, remark, repayment_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      repayment.id || generateId(),
      repayment.liability_id,
      repayment.period_number,
      Amount.format(repayment.amount || 0, 2),
      Amount.format(repayment.principal_amount || 0, 2),
      Amount.format(repayment.interest_amount || 0, 2),
      repayment.type,
      repayment.remark,
      formatForDB(repayment.repayment_time || getCurrentDate()),
      formatForDB(repayment.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM repayments WHERE id = ?`,
    values: [id]
  }
}

const update = (repayment: Repayment) => {
  let values: any[] = []
  const fields: string[] = []

  if (repayment.liability_id) {
    fields.push('liability_id = ?')
    values.push(repayment.liability_id)
  }
  if (repayment.period_number !== undefined) {
    fields.push('period_number = ?')
    values.push(repayment.period_number)
  }
  if (repayment.amount !== undefined && repayment.amount !== null) {
    fields.push('amount = ?')
    values.push(Amount.format(repayment.amount || 0, 2))
  }
  if (repayment.principal_amount !== undefined && repayment.principal_amount !== null) {
    fields.push('principal_amount = ?')
    values.push(Amount.format(repayment.principal_amount || 0, 2))
  }
  if (repayment.interest_amount !== undefined && repayment.interest_amount !== null) {
    fields.push('interest_amount = ?')
    values.push(Amount.format(repayment.interest_amount || 0, 2))
  }
  if (repayment.type) {
    fields.push('type = ?')
    values.push(repayment.type)
  }
  if (repayment.remark !== undefined) {
    fields.push('remark = ?')
    values.push(repayment.remark)
  }
  if (repayment.repayment_time) {
    fields.push('repayment_time = ?')
    values.push(formatForDB(repayment.repayment_time))
  }

  const statement = `UPDATE repayments SET ${fields.join(', ')} WHERE id = ?`
  values.push(repayment.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM repayments WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as Repayment : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM repayments')
  return rows as Repayment[]
}

export default { createTable, insert, del, update, queryById, queryAll }
