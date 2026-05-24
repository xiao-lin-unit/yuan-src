import { FundHolding } from '../../types/asset/fund'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 基金持有记录表
 * @returns 创建基金持有记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS fund_holdings (
          id TEXT PRIMARY KEY,
          fund_id TEXT NOT NULL,
          nav REAL NOT NULL,
          shares REAL NOT NULL,
          remaining_shares REAL NOT NULL,
          sell_status TEXT DEFAULT '未卖出',
          fee REAL DEFAULT 0,
          lock_period INTEGER DEFAULT 0,
          lock_end_date TEXT,
          transaction_time TEXT NOT NULL,
          account_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_fund_holdings_fund_id ON fund_holdings(fund_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_fund_holdings_account_id ON fund_holdings(account_id)' }
  ]
}

const insert = (holding: FundHolding) => {
  return {
    statement: `
      INSERT INTO fund_holdings (id, fund_id, nav, shares, remaining_shares, sell_status, fee, lock_period, lock_end_date, transaction_time, account_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      holding.id || generateId(),
      holding.fund_id,
      Amount.format(holding.nav || 0, 4),
      Amount.format(holding.shares || 0, 4),
      Amount.format(holding.remaining_shares || 0, 4),
      holding.sell_status || '未卖出',
      Amount.format(holding.fee || 0, 2),
      holding.lock_period || 0,
      holding.lock_end_date ? formatForDB(holding.lock_end_date) : null,
      formatForDB(holding.transaction_time || getCurrentDate()),
      holding.account_id,
      formatForDB(getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM fund_holdings WHERE id = ?`,
    values: [id]
  }
}

const update = (holding: FundHolding) => {
  let values: any[] = []
  const fields: string[] = []

  if (holding.fund_id) {
    fields.push('fund_id = ?')
    values.push(holding.fund_id)
  }
  if (holding.nav !== undefined && holding.nav !== null) {
    fields.push('nav = ?')
    values.push(Amount.format(holding.nav || 0, 4))
  }
  if (holding.shares !== undefined && holding.shares !== null) {
    fields.push('shares = ?')
    values.push(Amount.format(holding.shares || 0, 4))
  }
  if (holding.remaining_shares !== undefined && holding.remaining_shares !== null) {
    fields.push('remaining_shares = ?')
    values.push(Amount.format(holding.remaining_shares || 0, 4))
  }
  if (holding.sell_status) {
    fields.push('sell_status = ?')
    values.push(holding.sell_status)
  }
  if (holding.fee !== undefined && holding.fee !== null) {
    fields.push('fee = ?')
    values.push(Amount.format(holding.fee || 0, 2))
  }
  if (holding.lock_period !== undefined && holding.lock_period !== null) {
    fields.push('lock_period = ?')
    values.push(holding.lock_period)
  }
  if (holding.lock_end_date !== undefined) {
    fields.push('lock_end_date = ?')
    values.push(holding.lock_end_date ? formatForDB(holding.lock_end_date) : null)
  }
  if (holding.transaction_time) {
    fields.push('transaction_time = ?')
    values.push(formatForDB(holding.transaction_time))
  }
  if (holding.account_id) {
    fields.push('account_id = ?')
    values.push(holding.account_id)
  }

  const statement = `UPDATE fund_holdings SET ${fields.join(', ')} WHERE id = ?`
  values.push(holding.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM fund_holdings WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as FundHolding : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM fund_holdings')
  return rows as FundHolding[]
}

export default { createTable, insert, del, update, queryById, queryAll }
