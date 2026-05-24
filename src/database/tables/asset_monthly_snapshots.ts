import { AssetMonthlySnapshot } from '../../types/asset/asset'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 月度资产快照表
 * @returns 创建月度资产快照表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS asset_monthly_snapshots (
          id TEXT PRIMARY KEY,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          total_assets REAL DEFAULT 0,
          total_liabilities REAL DEFAULT 0,
          net_worth REAL DEFAULT 0,
          confirmed_profit_stocks REAL DEFAULT 0,
          confirmed_profit_funds REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(year, month)
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_asset_monthly_snapshots_year_month ON asset_monthly_snapshots(year, month)' }
  ]
}

const insert = (snapshot: AssetMonthlySnapshot) => {
  return {
    statement: `
      INSERT INTO asset_monthly_snapshots (id, year, month, total_assets, total_liabilities, net_worth, confirmed_profit_stocks, confirmed_profit_funds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      snapshot.id || generateId(),
      snapshot.year,
      snapshot.month,
      Amount.format(snapshot.total_assets || 0, 2),
      Amount.format(snapshot.total_liabilities || 0, 2),
      Amount.format(snapshot.net_worth || 0, 2),
      Amount.format(snapshot.confirmed_profit_stocks || 0, 2),
      Amount.format(snapshot.confirmed_profit_funds || 0, 2),
      formatForDB(snapshot.created_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM asset_monthly_snapshots WHERE id = ?`,
    values: [id]
  }
}

const update = (snapshot: AssetMonthlySnapshot) => {
  let values: any[] = []
  const fields: string[] = []

  if (snapshot.year !== undefined && snapshot.year !== null) {
    fields.push('year = ?')
    values.push(snapshot.year)
  }
  if (snapshot.month !== undefined && snapshot.month !== null) {
    fields.push('month = ?')
    values.push(snapshot.month)
  }
  if (snapshot.total_assets !== undefined && snapshot.total_assets !== null) {
    fields.push('total_assets = ?')
    values.push(Amount.format(snapshot.total_assets || 0, 2))
  }
  if (snapshot.total_liabilities !== undefined && snapshot.total_liabilities !== null) {
    fields.push('total_liabilities = ?')
    values.push(Amount.format(snapshot.total_liabilities || 0, 2))
  }
  if (snapshot.net_worth !== undefined && snapshot.net_worth !== null) {
    fields.push('net_worth = ?')
    values.push(Amount.format(snapshot.net_worth || 0, 2))
  }
  if (snapshot.confirmed_profit_stocks !== undefined && snapshot.confirmed_profit_stocks !== null) {
    fields.push('confirmed_profit_stocks = ?')
    values.push(Amount.format(snapshot.confirmed_profit_stocks || 0, 2))
  }
  if (snapshot.confirmed_profit_funds !== undefined && snapshot.confirmed_profit_funds !== null) {
    fields.push('confirmed_profit_funds = ?')
    values.push(Amount.format(snapshot.confirmed_profit_funds || 0, 2))
  }

  const statement = `UPDATE asset_monthly_snapshots SET ${fields.join(', ')} WHERE id = ?`
  values.push(snapshot.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM asset_monthly_snapshots WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as AssetMonthlySnapshot : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM asset_monthly_snapshots')
  return rows as AssetMonthlySnapshot[]
}

export default { createTable, insert, del, update, queryById, queryAll }
