import { query } from '../database/connection.js';

export interface CategoryRow {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
  participant_count?: number;
}

export class CategoryRepository {
  static async findAll(): Promise<CategoryRow[]> {
    return query<CategoryRow[]>(`
      SELECT pc.*, COUNT(p.id) as participant_count
      FROM participant_categories pc
      LEFT JOIN participants p ON p.category_id = pc.id AND p.status = 'ACTIVE'
      GROUP BY pc.id
      ORDER BY pc.id ASC
    `);
  }

  static async findById(id: number): Promise<CategoryRow | null> {
    const rows = await query<CategoryRow[]>(
      'SELECT * FROM participant_categories WHERE id = ?',
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: { name: string; code: string; description?: string }): Promise<number> {
    const res = await query<any>(
      'INSERT INTO participant_categories (name, code, description) VALUES (?, ?, ?)',
      [data.name, data.code, data.description || null]
    );
    return res.insertId;
  }

  static async update(id: number, data: Partial<CategoryRow>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE participant_categories SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number): Promise<void> {
    await query('DELETE FROM participant_categories WHERE id = ?', [id]);
  }
}
