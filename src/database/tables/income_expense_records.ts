import { IncomeExpenseRecord } from '../../types/expense/expense'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 收支记录表（记录用户手动录入的收入和支出）
 * @returns 创建收支记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS income_expense_records (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          sub_type TEXT,
          amount REAL NOT NULL,
          account_id TEXT,
          related_id TEXT,
          balance_after REAL NOT NULL,
          remark TEXT,
          status TEXT DEFAULT '正常',
          is_required INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_income_expense_records_account_id ON income_expense_records(account_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_income_expense_records_created_at ON income_expense_records(created_at)' }
  ]
}

const insert = (record: IncomeExpenseRecord) => {
  return {
    statement: `
      INSERT INTO income_expense_records (id, type, sub_type, amount, account_id, related_id, balance_after, remark, status, is_required, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      record.id || generateId(),
      record.type,
      record.sub_type,
      Amount.format(record.amount || 0, 2),
      record.account_id,
      record.related_id,
      Amount.format(record.balance_after || 0, 2),
      record.remark,
      record.status || '正常',
      (record as any).is_required ? 1 : 0,
      formatForDB(record.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM income_expense_records WHERE id = ?`,
    values: [id]
  }
}

const update = (record: IncomeExpenseRecord) => {
  let values: any[] = []
  const fields: string[] = []

  if (record.type) {
    fields.push('type = ?')
    values.push(record.type)
  }
  if (record.sub_type !== undefined) {
    fields.push('sub_type = ?')
    values.push(record.sub_type)
  }
  if (record.amount !== undefined && record.amount !== null) {
    fields.push('amount = ?')
    values.push(Amount.format(record.amount || 0, 2))
  }
  if (record.account_id !== undefined) {
    fields.push('account_id = ?')
    values.push(record.account_id)
  }
  if (record.related_id !== undefined) {
    fields.push('related_id = ?')
    values.push(record.related_id)
  }
  if (record.balance_after !== undefined && record.balance_after !== null) {
    fields.push('balance_after = ?')
    values.push(Amount.format(record.balance_after || 0, 2))
  }
  if (record.remark !== undefined) {
    fields.push('remark = ?')
    values.push(record.remark)
  }
  if (record.status) {
    fields.push('status = ?')
    values.push(record.status)
  }

  const statement = `UPDATE income_expense_records SET ${fields.join(', ')} WHERE id = ?`
  values.push(record.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM income_expense_records WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as IncomeExpenseRecord : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM income_expense_records')
  return rows as IncomeExpenseRecord[]
}

export default { createTable, insert, del, update, queryById, queryAll }
