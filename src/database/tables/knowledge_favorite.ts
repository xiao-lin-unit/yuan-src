import { KnowledgeFavorite } from '../../types/knowledge/knowledge'
import db from '../index.js'
import { formatForDB, getCurrentDate } from '../../utils/timezone'

/**
 * 知识收藏表
 * @returns 创建知识收藏表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS knowledge_favorite (
          article_id TEXT PRIMARY KEY,
          create_time TEXT NOT NULL
        )
      `
    }
  ]
}

const insert = (favorite: KnowledgeFavorite) => {
  return {
    statement: `
      INSERT INTO knowledge_favorite (article_id, create_time)
      VALUES (?, ?)
    `,
    values: [
      favorite.article_id,
      formatForDB(favorite.create_time || getCurrentDate())
    ]
  }
}

const del = (articleId: string) => {
  return {
    statement: `DELETE FROM knowledge_favorite WHERE article_id = ?`,
    values: [articleId]
  }
}

const update = (favorite: KnowledgeFavorite) => {
  let values: any[] = []
  const fields: string[] = []

  if (favorite.create_time) {
    fields.push('create_time = ?')
    values.push(formatForDB(favorite.create_time))
  }

  const statement = `UPDATE knowledge_favorite SET ${fields.join(', ')} WHERE article_id = ?`
  values.push(favorite.article_id)
  return {
    statement,
    values
  }
}

const queryById = async (articleId: string) => {
  const rows = await db.query('SELECT * FROM knowledge_favorite WHERE article_id = ?', [articleId])
  return rows.length > 0 ? rows[0] as KnowledgeFavorite : null
}

const queryAll = async () => {
  const rows = await db.query('SELECT * FROM knowledge_favorite')
  return rows as KnowledgeFavorite[]
}

export default { createTable, insert, del, update, queryById, queryAll }
