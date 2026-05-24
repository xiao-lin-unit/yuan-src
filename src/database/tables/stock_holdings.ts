import { StockHolding } from '../../types/asset/stock'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 股票持有记录表
 * @returns 创建股票持有记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS stock_holdings (
          id TEXT PRIMARY KEY,
          stock_id TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          remaining_quantity INTEGER NOT NULL,
          sell_status TEXT DEFAULT '未卖出',
          fee REAL DEFAULT 0,
          transaction_time TEXT NOT NULL,
          account_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_stock_holdings_stock_id ON stock_holdings(stock_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_stock_holdings_account_id ON stock_holdings(account_id)' }
  ]
}

const insert = (holding: StockHolding) => {
  return {
    statement: `
      INSERT INTO stock_holdings (id, stock_id, price, quantity, remaining_quantity, sell_status, fee, transaction_time, account_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      holding.id || generateId(),
      holding.stock_id,
      Amount.format(holding.price || 0, 4),
      holding.quantity || 0,
      holding.remaining_quantity || 0,
      holding.sell_status || '未卖出',
      Amount.format(holding.fee || 0, 2),
      formatForDB(holding.transaction_time || getCurrentDate()),
      holding.account_id,
      formatForDB(getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM stock_holdings WHERE id = ?`,
    values: [id]
  }
}

const update = (holding: StockHolding) => {
  let values: any[] = []
  const fields: string[] = []

  if (holding.stock_id) {
    fields.push('stock_id = ?')
    values.push(holding.stock_id)
  }
  if (holding.price !== undefined && holding.price !== null) {
    fields.push('price = ?')
    values.push(Amount.format(holding.price || 0, 4))
  }
  if (holding.quantity !== undefined && holding.quantity !== null) {
    fields.push('quantity = ?')
    values.push(holding.quantity)
  }
  if (holding.remaining_quantity !== undefined && holding.remaining_quantity !== null) {
    fields.push('remaining_quantity = ?')
    values.push(holding.remaining_quantity)
  }
  if (holding.sell_status) {
    fields.push('sell_status = ?')
    values.push(holding.sell_status)
  }
  if (holding.fee !== undefined && holding.fee !== null) {
    fields.push('fee = ?')
    values.push(Amount.format(holding.fee || 0, 2))
  }
  if (holding.transaction_time) {
    fields.push('transaction_time = ?')
    values.push(formatForDB(holding.transaction_time))
  }
  if (holding.account_id) {
    fields.push('account_id = ?')
    values.push(holding.account_id)
  }

  const statement = `UPDATE stock_holdings SET ${fields.join(', ')} WHERE id = ?`
  values.push(holding.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM stock_holdings WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as StockHolding : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM stock_holdings')
  return rows as StockHolding[]
}

export default { createTable, insert, del, update, queryById, queryAll }
