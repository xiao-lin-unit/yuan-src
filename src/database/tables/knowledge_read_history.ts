import { KnowledgeReadHistory } from '../../types/knowledge/knowledge'
import db from '../index.js'
import { formatForDB, getCurrentDate } from '../../utils/timezone'

/**
 * 阅读历史表
 * @returns 创建阅读历史表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS knowledge_read_history (
          article_id TEXT PRIMARY KEY,
          read_time TEXT NOT NULL,
          is_read INTEGER DEFAULT 1
        )
      `
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_knowledge_read_history_read_time ON knowledge_read_history(read_time)' }
  ]
}

const insert = (history: KnowledgeReadHistory) => {
  return {
    statement: `
      INSERT INTO knowledge_read_history (article_id, read_time, is_read)
      VALUES (?, ?, ?)
    `,
    values: [
      history.article_id,
      formatForDB(history.read_time || getCurrentDate()),
      history.is_read ?? 1
    ]
  }
}

const del = (articleId: string) => {
  return {
    statement: `DELETE FROM knowledge_read_history WHERE article_id = ?`,
    values: [articleId]
  }
}

const update = (history: KnowledgeReadHistory) => {
  let values: any[] = []
  const fields: string[] = []

  if (history.read_time) {
    fields.push('read_time = ?')
    values.push(formatForDB(history.read_time))
  }
  if (history.is_read !== undefined && history.is_read !== null) {
    fields.push('is_read = ?')
    values.push(history.is_read)
  }

  const statement = `UPDATE knowledge_read_history SET ${fields.join(', ')} WHERE article_id = ?`
  values.push(history.article_id)
  return {
    statement,
    values
  }
}

const queryById = async (articleId: string) => {
  const rows = await db.query('SELECT * FROM knowledge_read_history WHERE article_id = ?', [articleId])
  return rows.length > 0 ? rows[0] as KnowledgeReadHistory : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM knowledge_read_history')
  return rows as KnowledgeReadHistory[]
}

export default { createTable, insert, del, update, queryById, queryAll }
