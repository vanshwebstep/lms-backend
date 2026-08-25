const db = require('../config/db')
const { makeId } = require('../utils/id')

const TYPES = ['category', 'difficulty', 'language']
const TYPE_TO_KEY = {
  category: 'categories',
  difficulty: 'difficulties',
  language: 'languages',
}
const DEFAULTS = {
  category: ['Web Development', 'Backend', 'Design', 'Database', 'Mobile', 'Data Science', 'DevOps'],
  difficulty: ['Beginner', 'Intermediate', 'Advanced'],
  language: ['Hindi', 'English', 'Hinglish'],
}

let ensured = false

const normalizeType = (type) => {
  const value = String(type || '').trim().toLowerCase()
  if (value === 'categories') return 'category'
  if (value === 'difficulties') return 'difficulty'
  if (value === 'languages') return 'language'
  return TYPES.includes(value) ? value : null
}

const normalizeName = (name) => String(name || '').replace(/\s+/g, ' ').trim()

const courseColumn = (type) => {
  if (type === 'category') return 'category'
  if (type === 'difficulty') return 'difficulty'
  if (type === 'language') return 'language'
  return null
}

const ensureSchema = async () => {
  if (ensured) return
  await db.query(`CREATE TABLE IF NOT EXISTS course_master_options (
    id VARCHAR(64) PRIMARY KEY,
    type ENUM('category', 'difficulty', 'language') NOT NULL,
    name VARCHAR(160) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_by VARCHAR(64) NULL,
    creator_role ENUM('system', 'superadmin', 'coach') NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_master_options_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_course_master_options_type_name (type, name),
    INDEX idx_course_master_options_type (type),
    INDEX idx_course_master_options_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  try {
    await db.query("ALTER TABLE courses MODIFY difficulty VARCHAR(80) NOT NULL DEFAULT 'Beginner'")
  } catch (error) {
    if (!['ER_PARSE_ERROR', 'ER_BAD_FIELD_ERROR'].includes(error.code)) throw error
  }

  // Migration for databases created before category_id/difficulty_id/language_id existed.
  // Previously courses linked to course_master_options purely by matching (type, name) text,
  // which silently broke whenever an option was renamed inconsistently or deleted. These
  // columns give courses a real foreign-key link to the option row instead of a name match.
  for (const column of ['category_id', 'difficulty_id', 'language_id']) {
    try {
      await db.query(`ALTER TABLE courses ADD COLUMN ${column} VARCHAR(64) NULL`)
    } catch (error) {
      if (!['ER_DUP_FIELDNAME'].includes(error.code)) throw error
    }
  }
  for (const [column, type] of [['category_id', 'category'], ['difficulty_id', 'difficulty'], ['language_id', 'language']]) {
    const constraintName = `fk_courses_${type}`
    const existingConstraint = await db.first(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND CONSTRAINT_NAME = ?`,
      [constraintName]
    )
    if (existingConstraint) continue
    try {
      await db.query(
        `ALTER TABLE courses ADD CONSTRAINT ${constraintName} FOREIGN KEY (${column}) REFERENCES course_master_options(id) ON DELETE RESTRICT`
      )
    } catch (error) {
      // Some MySQL/MariaDB versions report a duplicate constraint as ER_CANT_CREATE_TABLE (errno 1005)
      // rather than a dedicated "duplicate key name" code, so the information_schema check above is
      // the primary guard; this catch is a fallback for that quirk instead of crashing app startup.
      if (!['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE'].includes(error.code)) throw error
    }
  }

  for (const type of TYPES) {
    for (const name of DEFAULTS[type]) {
      await db.query(
        `INSERT IGNORE INTO course_master_options (id, type, name, status, creator_role)
         VALUES (?, ?, ?, 'active', 'system')`,
        [makeId('option'), type, name]
      )
    }
  }

  // Backfill: link any existing courses that only have the legacy text value by
  // resolving the matching option id. Safe to re-run — only touches NULL ids.
  for (const [column, type] of [['category_id', 'category'], ['difficulty_id', 'difficulty'], ['language_id', 'language']]) {
    await db.query(
      `UPDATE courses c
       JOIN course_master_options o ON o.type = ? AND o.name = c.${type}
       SET c.${column} = o.id
       WHERE c.${column} IS NULL`,
      [type]
    )
  }

  ensured = true
}

// Resolves a (type, name) pair to an option id, creating the option if it doesn't exist yet
// (e.g. a coach typed a brand-new category while creating a course). This is what course.model.js
// uses so every course row gets stored with a real option id, not just the text.
const resolveOptionId = async (type, name) => {
  await ensureSchema()
  const normalizedType = normalizeType(type)
  const normalizedName = normalizeName(name)
  if (!normalizedType || !normalizedName) return null
  const existing = await db.first('SELECT id FROM course_master_options WHERE type = ? AND name = ?', [normalizedType, normalizedName])
  if (existing) return existing.id
  const id = makeId('option')
  await db.query(
    `INSERT INTO course_master_options (id, type, name, status, creator_role) VALUES (?, ?, ?, 'active', 'system')`,
    [id, normalizedType, normalizedName]
  )
  return id
}

const mapOption = (row) => ({
  id: row.id,
  type: row.type,
  name: row.name,
  status: row.status,
  creatorRole: row.creator_role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  usedCourses: Number(row.used_courses || 0),
  createdBy: row.created_by
    ? {
        id: row.created_by,
        name: row.creator_name,
        email: row.creator_email,
        role: row.creator_user_role || row.creator_role,
      }
    : null,
})

const selectSql = `SELECT o.*, u.name AS creator_name, u.email AS creator_email, u.role AS creator_user_role,
  (SELECT COUNT(*) FROM courses c WHERE
    c.category_id = o.id OR c.difficulty_id = o.id OR c.language_id = o.id
  ) AS used_courses
  FROM course_master_options o
  LEFT JOIN users u ON u.id = o.created_by`

const findById = async (id) => {
  await ensureSchema()
  const row = await db.first(`${selectSql} WHERE o.id = ?`, [id])
  return row ? mapOption(row) : null
}

const findByTypeAndName = async (type, name) => {
  await ensureSchema()
  const normalizedType = normalizeType(type)
  const normalizedName = normalizeName(name)
  if (!normalizedType || !normalizedName) return null
  const row = await db.first(`${selectSql} WHERE o.type = ? AND o.name = ?`, [normalizedType, normalizedName])
  return row ? mapOption(row) : null
}

const list = async ({ type, activeOnly = false } = {}) => {
  await ensureSchema()
  const normalizedType = normalizeType(type)
  const where = []
  const params = []
  if (normalizedType) {
    where.push('o.type = ?')
    params.push(normalizedType)
  }
  if (activeOnly) where.push("o.status = 'active'")
  const sql = `${selectSql}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY FIELD(o.type, 'category', 'difficulty', 'language'), o.name ASC`
  return (await db.query(sql, params)).map(mapOption)
}

const grouped = async ({ activeOnly = true } = {}) => {
  const rows = await list({ activeOnly })
  return rows.reduce(
    (acc, item) => {
      acc[TYPE_TO_KEY[item.type]].push(item)
      return acc
    },
    { categories: [], difficulties: [], languages: [] }
  )
}

const create = async ({ type, name, status = 'active', user }) => {
  await ensureSchema()
  const normalizedType = normalizeType(type)
  const normalizedName = normalizeName(name)
  if (!normalizedType || !normalizedName) return { error: 'Type and name are required' }

  const existing = await db.first('SELECT id, status FROM course_master_options WHERE type = ? AND name = ?', [normalizedType, normalizedName])
  if (existing) {
    if (existing.status !== 'active') {
      await db.query("UPDATE course_master_options SET status = 'active' WHERE id = ?", [existing.id])
    }
    return { option: await findById(existing.id), existing: true }
  }

  const id = makeId('option')
  await db.query(
    `INSERT INTO course_master_options (id, type, name, status, created_by, creator_role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, normalizedType, normalizedName, status === 'inactive' ? 'inactive' : 'active', user?.id || null, user?.role || 'system']
  )
  return { option: await findById(id), existing: false }
}

const update = async (id, body = {}) => {
  await ensureSchema()
  const existing = await db.first('SELECT * FROM course_master_options WHERE id = ?', [id])
  if (!existing) return null
  const name = normalizeName(body.name ?? existing.name)
  const status = body.status === 'inactive' ? 'inactive' : 'active'
  if (!name) return { error: 'Name is required' }
  const duplicate = await db.first(
    'SELECT id FROM course_master_options WHERE type = ? AND name = ? AND id <> ?',
    [existing.type, name, id]
  )
  if (duplicate) return { error: 'This value already exists' }

  const column = courseColumn(existing.type)
  await db.withTransaction(async (connection) => {
    await connection.execute('UPDATE course_master_options SET name = ?, status = ? WHERE id = ?', [name, status, id])
    if (column && name !== existing.name) {
      await connection.execute(`UPDATE courses SET ${column} = ? WHERE ${column} = ?`, [name, existing.name])
    }
  })
  return findById(id)
}

const remove = async (id) => {
  await ensureSchema()
  const existing = await db.first('SELECT id FROM course_master_options WHERE id = ?', [id])
  if (!existing) return false
  const inUse = await db.first(
    `SELECT COUNT(*) AS total FROM courses WHERE category_id = ? OR difficulty_id = ? OR language_id = ?`,
    [id, id, id]
  )
  if (Number(inUse?.total || 0) > 0) {
    return { error: 'This value is used by one or more courses and cannot be deleted. Deactivate it instead.' }
  }
  await db.query('DELETE FROM course_master_options WHERE id = ?', [id])
  return true
}

module.exports = {
  TYPES,
  normalizeType,
  ensureSchema,
  list,
  grouped,
  create,
  update,
  remove,
  findById,
  findByTypeAndName,
  resolveOptionId,
}