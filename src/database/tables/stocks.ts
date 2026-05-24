import { Stock } from '../../types/asset/stock'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 股票表
 * @returns 创建股票表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS stocks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT,
          quantity INTEGER DEFAULT 0,
          current_price REAL DEFAULT 0,
          cost_price REAL DEFAULT 0,
          confirmed_profit REAL DEFAULT 0,
          first_buy_date TEXT,
          account_id TEXT,
          status TEXT DEFAULT '开启',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_stocks_account_id ON stocks(account_id)' }
  ]
}

const insert = (stock: Stock) => {
  return {
    statement: `
      INSERT INTO stocks (id, name, code, quantity, current_price, cost_price, confirmed_profit, first_buy_date, account_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      stock.id || generateId(),
      stock.name,
      stock.code,
      stock.quantity || 0,
      Amount.format(stock.current_price || 0, 4),
      Amount.format(stock.cost_price || 0, 4),
      Amount.format(stock.confirmed_profit || 0, 2),
      stock.first_buy_date ? formatForDB(stock.first_buy_date) : null,
      stock.account_id,
      stock.status || '开启',
      formatForDB(stock.created_at || getCurrentDate()),
      formatForDB(stock.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM stocks WHERE id = ?`,
    values: [id]
  }
}

const update = (stock: Stock) => {
  let values: any[] = []
  const fields: string[] = []

  if (stock.name) {
    fields.push('name = ?')
    values.push(stock.name)
  }
  if (stock.code !== undefined) {
    fields.push('code = ?')
    values.push(stock.code)
  }
  if (stock.quantity !== undefined && stock.quantity !== null) {
    fields.push('quantity = ?')
    values.push(stock.quantity)
  }
  if (stock.current_price !== undefined && stock.current_price !== null) {
    fields.push('current_price = ?')
    values.push(Amount.format(stock.current_price || 0, 4))
  }
  if (stock.cost_price !== undefined && stock.cost_price !== null) {
    fields.push('cost_price = ?')
    values.push(Amount.format(stock.cost_price || 0, 4))
  }
  if (stock.confirmed_profit !== undefined && stock.confirmed_profit !== null) {
    fields.push('confirmed_profit = ?')
    values.push(Amount.format(stock.confirmed_profit || 0, 2))
  }
  if (stock.first_buy_date) {
    fields.push('first_buy_date = ?')
    values.push(formatForDB(stock.first_buy_date))
  }
  if (stock.account_id) {
    fields.push('account_id = ?')
    values.push(stock.account_id)
  }
  if (stock.status) {
    fields.push('status = ?')
    values.push(stock.status)
  }

  fields.push('updated_at = ?')
  values.push(formatForDB(stock.updated_at || getCurrentDate()))
  const statement = `UPDATE stocks SET ${fields.join(', ')} WHERE id = ?`
  values.push(stock.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM stocks WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as Stock : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM stocks')
  return rows as Stock[]
}

export default { createTable, insert, del, update, queryById, queryAll }
