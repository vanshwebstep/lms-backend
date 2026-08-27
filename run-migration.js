const mysql = require('mysql2/promise');
(async () => {
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'lms_db' });
    await pool.execute('ALTER TABLE lessons ADD COLUMN drip_days INT NOT NULL DEFAULT 0');
    console.log('lessons updated');
  } catch (e) { console.log('lessons error:', e.message); }
  
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'lms_db' });
    await pool.execute('ALTER TABLE quizzes ADD COLUMN drip_days INT NOT NULL DEFAULT 0');
    console.log('quizzes updated');
  } catch (e) { console.log('quizzes error:', e.message); }
  
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'lms_db' });
    await pool.execute('ALTER TABLE assignments ADD COLUMN drip_days INT NOT NULL DEFAULT 0');
    console.log('assignments updated');
  } catch (e) { console.log('assignments error:', e.message); }
  
  process.exit();
})();
