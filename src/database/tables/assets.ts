import { Asset } from '../../types/asset/asset'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'
import type dayjs from 'dayjs'

/**
 * 资产表
 * @returns 创建资产表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          amount REAL DEFAULT 0,
          account_id TEXT,
          period TEXT,
          period_count INTEGER DEFAULT 0,
          income_date TEXT,
          next_income_date TEXT,
          calculation_type TEXT,
          income_amount REAL DEFAULT 0,
          annual_yield_rate REAL DEFAULT 0,
          status TEXT DEFAULT '开启',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_assets_account_id ON assets(account_id)' }
  ]
}

const insert = (asset: Asset) => {
  return {
    statement: `
      INSERT INTO assets (id, type, name, amount, account_id, period, period_count, income_date, next_income_date, calculation_type, income_amount, annual_yield_rate, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      asset.id || generateId(),
      asset.type,
      asset.name,
      Amount.format(asset.amount || 0, 2),
      asset.account_id,
      asset.period,
      asset.period_count || 0,
      formatForDB(asset.income_date),
      formatForDB(asset.next_income_date),
      asset.calculation_type,
      Amount.format(asset.income_amount || 0, 2),
      Amount.format(asset.annual_yield_rate || 0, 4),
      asset.status || '开启',
      formatForDB(asset.created_at || getCurrentDate()),
      formatForDB(asset.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM assets WHERE id = ?`,
    values: [id]
  }
}

const update = (asset: Asset) => {
  let values: any[] = []
  const fields: string[] = []

  if (asset.type) {
    fields.push('type = ?')
    values.push(asset.type)
  }
  if (asset.name) {
    fields.push('name = ?')
    values.push(asset.name)
  }
  if (asset.amount !== undefined && asset.amount !== null) {
    fields.push('amount = ?')
    values.push(Amount.format(asset.amount || 0, 2))
  }
  if (asset.account_id) {
    fields.push('account_id = ?')
    values.push(asset.account_id)
  }
  if (asset.period !== undefined) {
    fields.push('period = ?')
    values.push(asset.period)
  }
  if (asset.period_count !== undefined && asset.period_count !== null) {
    fields.push('period_count = ?')
    values.push(asset.period_count)
  }
  if (asset.income_date !== undefined) {
    fields.push('income_date = ?')
    values.push(asset.income_date)
  }
  if (asset.next_income_date !== undefined) {
    fields.push('next_income_date = ?')
    values.push(asset.next_income_date)
  }
  if (asset.calculation_type !== undefined) {
    fields.push('calculation_type = ?')
    values.push(asset.calculation_type)
  }
  if (asset.income_amount !== undefined && asset.income_amount !== null) {
    fields.push('income_amount = ?')
    values.push(Amount.format(asset.income_amount || 0, 2))
  }
  if (asset.annual_yield_rate !== undefined && asset.annual_yield_rate !== null) {
    fields.push('annual_yield_rate = ?')
    values.push(Amount.format(asset.annual_yield_rate || 0, 4))
  }
  if (asset.status) {
    fields.push('status = ?')
    values.push(asset.status)
  }

  fields.push('updated_at = ?')
  values.push(formatForDB(asset.updated_at || getCurrentDate()))
  const statement = `UPDATE assets SET ${fields.join(', ')} WHERE id = ?`
  values.push(asset.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM assets WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as Asset : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM assets')
  return rows as Asset[]
}

const addAssetsAmount = (amount: number, id: string, updated_at: dayjs.Dayjs | string = getCurrentDate()) => {
  return {
    statement: `UPDATE assets SET amount = amount + ?, updated_at = ? WHERE id = ?`,
    values: [Amount.format(amount, 2), formatForDB(updated_at), id]
  }
}
const updateAssetsAmount = (amount: number, id: string, updated_at: dayjs.Dayjs | string = getCurrentDate()) => {
  return {
    statement: `UPDATE assets SET amount = ?, updated_at = ? WHERE id = ?`,
    values: [Amount.format(amount, 2), formatForDB(updated_at), id]
  }
}



export default { createTable, insert, del, update, queryById, queryAll, addAssetsAmount, updateAssetsAmount }
