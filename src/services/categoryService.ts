import { Category, expenseCategories, incomeCategories } from '../data/categories'

/**
 * 分类管理服务
 * 分类数据全部来自静态数据（/src/data/categories.ts），不使用数据库表
 */
export class CategoryService {
  /**
   * 获取所有分类
   * @param type 分类类型（可选）
   * @returns 分类列表
   */
  static async getCategories(type?: string): Promise<Category[]> {
    const all = [...expenseCategories, ...incomeCategories]
    if (type) {
      return all.filter(cat => cat.type === type)
    }
    return all
  }

  /**
   * 根据 ID 获取分类
   * @param id 分类 ID
   * @returns 分类对象
   */
  static async getCategoryById(id: string): Promise<Category | null> {
    const all = [...expenseCategories, ...incomeCategories]
    return all.find(c => c.id === id) ?? null
  }
}
