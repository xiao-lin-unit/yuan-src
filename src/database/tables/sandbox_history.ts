import { SandboxHistory } from '../../types/sandbox/sandbox'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'

/**
 * 沙盘推演历史表
 * @returns 创建沙盘推演历史表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS sandbox_history (
          id TEXT PRIMARY KEY,
          scene_type INTEGER NOT NULL,
          scene_name TEXT NOT NULL,
          user_title TEXT,
          simulate_time TEXT NOT NULL,
          params TEXT NOT NULL,
          result_desc TEXT,
          created_at TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0 NOT NULL,
          remark TEXT
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_sandbox_history_scene_type ON sandbox_history(scene_type)' },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_sandbox_history_is_deleted ON sandbox_history(is_deleted)' }
  ]
}

const insert = (history: SandboxHistory) => {
  return {
    statement: `
      INSERT INTO sandbox_history (id, scene_type, scene_name, user_title, simulate_time, params, result_desc, created_at, is_deleted, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      history.id || generateId(),
      history.scene_type,
      history.scene_name,
      history.user_title,
      formatForDB(history.simulate_time || getCurrentDate()),
      history.params,
      history.result_desc,
      formatForDB(history.created_at || getCurrentDate()),
      history.is_deleted ?? 0,
      history.remark
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM sandbox_history WHERE id = ?`,
    values: [id]
  }
}

const update = (history: SandboxHistory) => {
  let values: any[] = []
  const fields: string[] = []

  if (history.scene_type !== undefined && history.scene_type !== null) {
    fields.push('scene_type = ?')
    values.push(history.scene_type)
  }
  if (history.scene_name) {
    fields.push('scene_name = ?')
    values.push(history.scene_name)
  }
  if (history.user_title !== undefined) {
    fields.push('user_title = ?')
    values.push(history.user_title)
  }
  if (history.simulate_time) {
    fields.push('simulate_time = ?')
    values.push(formatForDB(history.simulate_time))
  }
  if (history.params !== undefined) {
    fields.push('params = ?')
    values.push(history.params)
  }
  if (history.result_desc !== undefined) {
    fields.push('result_desc = ?')
    values.push(history.result_desc)
  }
  if (history.is_deleted !== undefined && history.is_deleted !== null) {
    fields.push('is_deleted = ?')
    values.push(history.is_deleted)
  }
  if (history.remark !== undefined) {
    fields.push('remark = ?')
    values.push(history.remark)
  }

  const statement = `UPDATE sandbox_history SET ${fields.join(', ')} WHERE id = ?`
  values.push(history.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM sandbox_history WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as SandboxHistory : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM sandbox_history')
  return rows as SandboxHistory[]
}

export default { createTable, insert, del, update, queryById, queryAll }
