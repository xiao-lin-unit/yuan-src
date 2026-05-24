import { FundTransaction } from '../../types/asset/fund'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 基金交易记录表
 * @returns 创建基金交易记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS fund_transactions (
          id TEXT PRIMARY KEY,
          fund_id TEXT NOT NULL,
          transaction_nav REAL NOT NULL,
          shares REAL NOT NULL,
          type TEXT NOT NULL,
          hold_ids TEXT,
          fee REAL DEFAULT 0,
          transaction_time TEXT NOT NULL,
          account_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_fund_transactions_fund_id ON fund_transactions(fund_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_fund_transactions_account_id ON fund_transactions(account_id)' }
  ]
}

const insert = (transaction: FundTransaction) => {
  return {
    statement: `
      INSERT INTO fund_transactions (id, fund_id, transaction_nav, shares, type, hold_ids, fee, transaction_time, account_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      transaction.id || generateId(),
      transaction.fund_id,
      Amount.format(transaction.transaction_nav || 0, 4),
      Amount.format(transaction.shares || 0, 4),
      transaction.type,
      transaction.hold_ids,
      Amount.format(transaction.fee || 0, 2),
      formatForDB(transaction.transaction_time || getCurrentDate()),
      transaction.account_id,
      formatForDB(getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM fund_transactions WHERE id = ?`,
    values: [id]
  }
}

const update = (transaction: FundTransaction) => {
  let values: any[] = []
  const fields: string[] = []

  if (transaction.fund_id) {
    fields.push('fund_id = ?')
    values.push(transaction.fund_id)
  }
  if (transaction.transaction_nav !== undefined && transaction.transaction_nav !== null) {
    fields.push('transaction_nav = ?')
    values.push(Amount.format(transaction.transaction_nav || 0, 4))
  }
  if (transaction.shares !== undefined && transaction.shares !== null) {
    fields.push('shares = ?')
    values.push(Amount.format(transaction.shares || 0, 4))
  }
  if (transaction.type) {
    fields.push('type = ?')
    values.push(transaction.type)
  }
  if (transaction.hold_ids !== undefined) {
    fields.push('hold_ids = ?')
    values.push(transaction.hold_ids)
  }
  if (transaction.fee !== undefined && transaction.fee !== null) {
    fields.push('fee = ?')
    values.push(Amount.format(transaction.fee || 0, 2))
  }
  if (transaction.transaction_time) {
    fields.push('transaction_time = ?')
    values.push(formatForDB(transaction.transaction_time))
  }
  if (transaction.account_id) {
    fields.push('account_id = ?')
    values.push(transaction.account_id)
  }

  const statement = `UPDATE fund_transactions SET ${fields.join(', ')} WHERE id = ?`
  values.push(transaction.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM fund_transactions WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as FundTransaction : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM fund_transactions')
  return rows as FundTransaction[]
}

export default { createTable, insert, del, update, queryById, queryAll }
