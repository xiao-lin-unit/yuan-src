import { Category } from '../../types/expense/expense'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'

/**
 * 分类表
 * @returns 创建分类表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT,
          iconText TEXT,
          type TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)' }
  ]
}

const insert = (category: Category) => {
  return {
    statement: `
      INSERT INTO categories (id, name, icon, iconText, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      category.id || generateId(),
      category.name,
      category.icon,
      category.iconText,
      category.type,
      formatForDB(category.created_at || getCurrentDate()),
      formatForDB(category.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
  return {
    statement: `DELETE FROM categories WHERE id = ?`,
    values: [id]
  }
}

const update = (category: Category) => {
  let values: any[] = []
  const fields: string[] = []

  if (category.name) {
    fields.push('name = ?')
    values.push(category.name)
  }
  if (category.icon !== undefined) {
    fields.push('icon = ?')
    values.push(category.icon)
  }
  if (category.iconText !== undefined) {
    fields.push('iconText = ?')
    values.push(category.iconText)
  }
  if (category.type) {
    fields.push('type = ?')
    values.push(category.type)
  }

  fields.push('updated_at = ?')
  values.push(formatForDB(category.updated_at || getCurrentDate()))
  const statement = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`
  values.push(category.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const rows = await db.query('SELECT * FROM categories WHERE id = ?', [id])
  return rows.length > 0 ? rows[0] as Category : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM categories')
  return rows as Category[]
}

export default { createTable, insert, del, update, queryById, queryAll }
