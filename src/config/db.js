const mysql = require('mysql2/promise')
const env = require('./env')

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  supportBigNumbers: true,
})

const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params)
  return rows
}

const first = async (sql, params = []) => {
  const rows = await query(sql, params)
  return rows[0] || null
}

const withTransaction = async (callback) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const ping = async () => {
  await query('SELECT 1 AS ok')
  return true
}

module.exports = { pool, query, first, withTransaction, ping }