import { PendingRepayment } from '../../types/liability/liability'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 待还记录表
 * @returns 创建待还记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS pending_repayments (
          id TEXT PRIMARY KEY,
          liability_id TEXT NOT NULL,
          period_number INTEGER NOT NULL,
          due_date TEXT NOT NULL,
          principal_amount REAL NOT NULL,
          interest_amount REAL NOT NULL,
          total_amount REAL NOT NULL,
          status TEXT DEFAULT '未还',
          paid_date TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_pending_repayments_liability_id ON pending_repayments(liability_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_pending_repayments_due_date ON pending_repayments(due_date)' }
  ]
}

const insert = (pending: PendingRepayment) => {
  return {
    statement: `
      INSERT INTO pending_repayments (id, liability_id, period_number, due_date, principal_amount, interest_amount, total_amount, status, paid_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      pending.id || generateId(),
      pending.liability_id,
      pending.period_number,
      formatForDB(pending.due_date || getCurrentDate()),
      Amount.format(pending.principal_amount || 0, 2),
      Amount.format(pending.interest_amount || 0, 2),
      Amount.format(pending.total_amount || 0, 2),
      pending.status || '未还',
      pending.paid_date ? formatForDB(pending.paid_date) : null,
      formatForDB(pending.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM pending_repayments WHERE id = ?`,
    values: [id]
  }
}

const update = (pending: PendingRepayment) => {
  let values: any[] = []
  const fields: string[] = []

  if (pending.liability_id) {
    fields.push('liability_id = ?')
    values.push(pending.liability_id)
  }
  if (pending.period_number !== undefined && pending.period_number !== null) {
    fields.push('period_number = ?')
    values.push(pending.period_number)
  }
  if (pending.due_date) {
    fields.push('due_date = ?')
    values.push(formatForDB(pending.due_date))
  }
  if (pending.principal_amount !== undefined && pending.principal_amount !== null) {
    fields.push('principal_amount = ?')
    values.push(Amount.format(pending.principal_amount || 0, 2))
  }
  if (pending.interest_amount !== undefined && pending.interest_amount !== null) {
    fields.push('interest_amount = ?')
    values.push(Amount.format(pending.interest_amount || 0, 2))
  }
  if (pending.total_amount !== undefined && pending.total_amount !== null) {
    fields.push('total_amount = ?')
    values.push(Amount.format(pending.total_amount || 0, 2))
  }
  if (pending.status) {
    fields.push('status = ?')
    values.push(pending.status)
  }
  if (pending.paid_date !== undefined) {
    fields.push('paid_date = ?')
    values.push(pending.paid_date ? formatForDB(pending.paid_date) : null)
  }

  const statement = `UPDATE pending_repayments SET ${fields.join(', ')} WHERE id = ?`
  values.push(pending.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM pending_repayments WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as PendingRepayment : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM pending_repayments')
  return rows as PendingRepayment[]
}

export default { createTable, insert, del, update, queryById, queryAll }
