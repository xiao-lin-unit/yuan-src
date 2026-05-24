import { AssetIncomeRecord } from '../../types/asset/asset'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 普通资产收益记录表
 * @returns 创建普通资产收益记录表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS asset_income_records (
          id TEXT PRIMARY KEY,
          asset_id TEXT NOT NULL,
          income_amount REAL NOT NULL,
          record_time TEXT NOT NULL,
          remark TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_asset_income_records_asset_id ON asset_income_records(asset_id)' }
  ]
}

const insert = (record: AssetIncomeRecord) => {
  return {
    statement: `
      INSERT INTO asset_income_records (id, asset_id, income_amount, record_time, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    values: [
      record.id || generateId(),
      record.asset_id,
      Amount.format(record.income_amount || 0, 2),
      formatForDB(record.record_time || getCurrentDate()),
      record.remark,
      formatForDB(record.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM asset_income_records WHERE id = ?`,
    values: [id]
  }
}

const update = (record: AssetIncomeRecord) => {
  let values: any[] = []
  const fields: string[] = []

  if (record.asset_id) {
    fields.push('asset_id = ?')
    values.push(record.asset_id)
  }
  if (record.income_amount !== undefined && record.income_amount !== null) {
    fields.push('income_amount = ?')
    values.push(Amount.format(record.income_amount || 0, 2))
  }
  if (record.record_time) {
    fields.push('record_time = ?')
    values.push(formatForDB(record.record_time))
  }
  if (record.remark !== undefined) {
    fields.push('remark = ?')
    values.push(record.remark)
  }

  const statement = `UPDATE asset_income_records SET ${fields.join(', ')} WHERE id = ?`
  values.push(record.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM asset_income_records WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as AssetIncomeRecord : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM asset_income_records')
  return rows as AssetIncomeRecord[]
}

export default { createTable, insert, del, update, queryById, queryAll }
