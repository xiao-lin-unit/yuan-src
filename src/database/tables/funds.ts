import { Fund } from '../../types/asset/fund'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 基金表
 * @returns 创建基金表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS funds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT,
          shares REAL DEFAULT 0,
          current_nav REAL DEFAULT 0,
          cost_nav REAL DEFAULT 0,
          confirmed_profit REAL DEFAULT 0,
          total_fee REAL DEFAULT 0,
          first_buy_date TEXT,
          has_lock INTEGER DEFAULT 0,
          lock_period INTEGER DEFAULT 0,
          account_id TEXT,
          status TEXT DEFAULT '开启',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_funds_account_id ON funds(account_id)' }
  ]
}

const insert = (fund: Fund) => {
  return {
    statement: `
      INSERT INTO funds (id, name, code, shares, current_nav, cost_nav, confirmed_profit, total_fee, first_buy_date, has_lock, lock_period, account_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      fund.id || generateId(),
      fund.name,
      fund.code,
      Amount.format(fund.shares || 0, 4),
      Amount.format(fund.current_nav || 0, 4),
      Amount.format(fund.cost_nav || 0, 4),
      Amount.format(fund.confirmed_profit || 0, 2),
      Amount.format(fund.total_fee || 0, 2),
      fund.first_buy_date ? formatForDB(fund.first_buy_date) : null,
      fund.has_lock ? 1 : 0,
      fund.lock_period || 0,
      fund.account_id,
      fund.status || '开启',
      formatForDB(fund.created_at || getCurrentDate()),
      formatForDB(fund.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM funds WHERE id = ?`,
    values: [id]
  }
}

const update = (fund: Fund) => {
  let values: any[] = []
  const fields: string[] = []

  if (fund.name) {
    fields.push('name = ?')
    values.push(fund.name)
  }
  if (fund.code !== undefined) {
    fields.push('code = ?')
    values.push(fund.code)
  }
  if (fund.shares !== undefined && fund.shares !== null) {
    fields.push('shares = ?')
    values.push(Amount.format(fund.shares || 0, 4))
  }
  if (fund.current_nav !== undefined && fund.current_nav !== null) {
    fields.push('current_nav = ?')
    values.push(Amount.format(fund.current_nav || 0, 4))
  }
  if (fund.cost_nav !== undefined && fund.cost_nav !== null) {
    fields.push('cost_nav = ?')
    values.push(Amount.format(fund.cost_nav || 0, 4))
  }
  if (fund.confirmed_profit !== undefined && fund.confirmed_profit !== null) {
    fields.push('confirmed_profit = ?')
    values.push(Amount.format(fund.confirmed_profit || 0, 2))
  }
  if (fund.total_fee !== undefined && fund.total_fee !== null) {
    fields.push('total_fee = ?')
    values.push(Amount.format(fund.total_fee || 0, 2))
  }
  if (fund.first_buy_date) {
    fields.push('first_buy_date = ?')
    values.push(formatForDB(fund.first_buy_date))
  }
  if (fund.has_lock !== undefined && fund.has_lock !== null) {
    fields.push('has_lock = ?')
    values.push(fund.has_lock ? 1 : 0)
  }
  if (fund.lock_period !== undefined && fund.lock_period !== null) {
    fields.push('lock_period = ?')
    values.push(fund.lock_period)
  }
  if (fund.account_id) {
    fields.push('account_id = ?')
    values.push(fund.account_id)
  }
  if (fund.status) {
    fields.push('status = ?')
    values.push(fund.status)
  }

  fields.push('updated_at = ?')
  values.push(formatForDB(fund.updated_at || getCurrentDate()))
  const statement = `UPDATE funds SET ${fields.join(', ')} WHERE id = ?`
  values.push(fund.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM funds WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as Fund : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM funds')
  return rows as Fund[]
}

export default { createTable, insert, del, update, queryById, queryAll }
