import { AccountTransaction } from '../../types/account/account'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 账户流水表（记录账户余额变动，包括转账和现金操作）
 * @returns 创建账户流水表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS account_transactions (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          description TEXT,
          transaction_time TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id)' }
  ]
}

const insert = (transaction: AccountTransaction) => {
  return {
    statement: `
      INSERT INTO account_transactions (id, account_id, type, amount, balance_after, description, transaction_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      transaction.id || generateId(),
      transaction.account_id,
      transaction.type,
      Amount.format(transaction.amount || 0, 2),
      Amount.format(transaction.balance_after || 0, 2),
      transaction.description,
      formatForDB(transaction.transaction_time || getCurrentDate()),
      formatForDB(transaction.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM account_transactions WHERE id = ?`,
    values: [id]
  }
}

const update = (transaction: AccountTransaction) => {
  let values: any[] = []
  const fields: string[] = []

  if (transaction.account_id) {
    fields.push('account_id = ?')
    values.push(transaction.account_id)
  }
  if (transaction.type) {
    fields.push('type = ?')
    values.push(transaction.type)
  }
  if (transaction.amount !== undefined && transaction.amount !== null) {
    fields.push('amount = ?')
    values.push(Amount.format(transaction.amount || 0, 2))
  }
  if (transaction.balance_after !== undefined && transaction.balance_after !== null) {
    fields.push('balance_after = ?')
    values.push(Amount.format(transaction.balance_after || 0, 2))
  }
  if (transaction.description !== undefined) {
    fields.push('description = ?')
    values.push(transaction.description)
  }
  if (transaction.transaction_time) {
    fields.push('transaction_time = ?')
    values.push(formatForDB(transaction.transaction_time))
  }

  const statement = `UPDATE account_transactions SET ${fields.join(', ')} WHERE id = ?`
  values.push(transaction.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM account_transactions WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as AccountTransaction : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM account_transactions')
  return rows as AccountTransaction[]
}

export default { createTable, insert, del, update, queryById, queryAll }
