const db = require('./src/config/db');

(async () => {
  const tables = [
    { table: 'users', columns: ['avatar_url'] },
    { table: 'courses', columns: ['thumbnail_url', 'promo_video', 'description'] },
    { table: 'lessons', columns: ['content_url'] },
    { table: 'assignments', columns: ['attachment_url'] },
    { table: 'certificates', columns: ['file_url'] },
    { table: 'uploads', columns: ['file_url'] }
  ];

  try {
    let totalUpdated = 0;
    for (const { table, columns } of tables) {
      for (const col of columns) {
        const query = `UPDATE ${table} SET ${col} = REPLACE(${col}, 'http://localhost:5000', 'https://lms.shipowl.io') WHERE ${col} LIKE '%http://localhost:5000%'`;
        const res = await db.query(query);
        if (res.affectedRows > 0) {
           console.log(`Updated ${res.affectedRows} rows in ${table}.${col}`);
           totalUpdated += res.affectedRows;
        }
      }
    }
    console.log(`Finished. Total updated: ${totalUpdated}`);
  } catch (err) {
    console.error(err);
  }
  process.exit();
})();
