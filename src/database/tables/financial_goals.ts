import { FinancialGoal } from '../../types/financial/goal'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'

/**
 * 财务目标表
 * @returns 创建财务目标表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS financial_goals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          target_amount REAL NOT NULL,
          monthly_amount REAL NOT NULL,
          period INTEGER NOT NULL,
          account_id TEXT,
          status TEXT DEFAULT '未开始',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_financial_goals_account_id ON financial_goals(account_id)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status)' }
  ]
}

const insert = (goal: FinancialGoal) => {
  return {
    statement: `
      INSERT INTO financial_goals (id, name, type, target_amount, monthly_amount, period, account_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      goal.id || generateId(),
      goal.name,
      goal.type,
      Amount.format(goal.target_amount || 0, 2),
      Amount.format(goal.monthly_amount || 0, 2),
      goal.period,
      goal.account_id,
      goal.status || '未开始',
      formatForDB(goal.created_at || getCurrentDate()),
      formatForDB(goal.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM financial_goals WHERE id = ?`,
    values: [id]
  }
}

const update = (goal: FinancialGoal) => {
  let values: any[] = []
  const fields: string[] = []

  if (goal.name) {
    fields.push('name = ?')
    values.push(goal.name)
  }
  if (goal.type) {
    fields.push('type = ?')
    values.push(goal.type)
  }
  if (goal.target_amount !== undefined && goal.target_amount !== null) {
    fields.push('target_amount = ?')
    values.push(Amount.format(goal.target_amount || 0, 2))
  }
  if (goal.monthly_amount !== undefined && goal.monthly_amount !== null) {
    fields.push('monthly_amount = ?')
    values.push(Amount.format(goal.monthly_amount || 0, 2))
  }
  if (goal.period !== undefined && goal.period !== null) {
    fields.push('period = ?')
    values.push(goal.period)
  }
  if (goal.account_id) {
    fields.push('account_id = ?')
    values.push(goal.account_id)
  }
  if (goal.status) {
    fields.push('status = ?')
    values.push(goal.status)
  }

  fields.push('updated_at = ?')
  values.push(formatForDB(goal.updated_at || getCurrentDate()))
  const statement = `UPDATE financial_goals SET ${fields.join(', ')} WHERE id = ?`
  values.push(goal.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM financial_goals WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as FinancialGoal : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM financial_goals')
  return rows as FinancialGoal[]
}

export default { createTable, insert, del, update, queryById, queryAll }
