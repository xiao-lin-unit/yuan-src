/**
 * Knowledge module type definitions
 */

// Knowledge favorite record
export interface KnowledgeFavorite {
  article_id: string
  create_time: string
}

// Knowledge read history record
export interface KnowledgeReadHistory {
  article_id: string
  read_time: string
  is_read: number
}
