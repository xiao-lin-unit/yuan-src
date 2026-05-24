import { StockTransaction } from '../../types/asset/stock'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 股票交易记录表
 * @returns 创建股票交易记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS stock_transactions (
          id TEXT PRIMARY KEY,
          stock_id TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          type TEXT NOT NULL,
          hold_ids TEXT,
          fee REAL DEFAULT 0,
          transaction_time TEXT NOT NULL,
          account_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_stock_transactions_stock_id ON stock_transactions(stock_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_stock_transactions_account_id ON stock_transactions(account_id)' }
  ]
}

const insert = (transaction: StockTransaction) => {
  return {
    statement: `
      INSERT INTO stock_transactions (id, stock_id, price, quantity, type, hold_ids, fee, transaction_time, account_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      transaction.id || generateId(),
      transaction.stock_id,
      Amount.format(transaction.price || 0, 4),
      transaction.quantity || 0,
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
    statement: `DELETE FROM stock_transactions WHERE id = ?`,
    values: [id]
  }
}

const update = (transaction: StockTransaction) => {
  let values: any[] = []
  const fields: string[] = []

  if (transaction.stock_id) {
    fields.push('stock_id = ?')
    values.push(transaction.stock_id)
  }
  if (transaction.price !== undefined && transaction.price !== null) {
    fields.push('price = ?')
    values.push(Amount.format(transaction.price || 0, 4))
  }
  if (transaction.quantity !== undefined && transaction.quantity !== null) {
    fields.push('quantity = ?')
    values.push(transaction.quantity)
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

  const statement = `UPDATE stock_transactions SET ${fields.join(', ')} WHERE id = ?`
  values.push(transaction.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM stock_transactions WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as StockTransaction : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM stock_transactions')
  return rows as StockTransaction[]
}

export default { createTable, insert, del, update, queryById, queryAll }
