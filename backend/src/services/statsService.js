const pool = require("../db");

/* 1 */
exports.noActiveUsers = async () => {
  const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (
          WHERE replied_rate > 0 OR following_count > 0
        ) AS active_rows,
        COUNT(*) AS total_rows
      FROM addresses
  `);

  return result.rows[0];
};

/* 2 */
exports.getActiveUsers = async (source) => {
  let query = `
    SELECT address, source, wallet_usd_value, contacted
    FROM addresses
    WHERE (replied_rate > 0 OR following_count > 0)
  `;

  const params = [];

  if (source) {
    query += " AND source = $1";
    params.push(source);
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/* 3 */
exports.getSources = async () => {
  const result = await pool.query(`
      SELECT DISTINCT source FROM addresses
  `);

  return result.rows;
};

/* 4 */
exports.updateActiveUsers = async (source) => {
  // TODO // ACTUALLY SEND MESSAGES TO USERS INSTEAD OF JUST UPDATING CONTACTED STATUS
  
  let query = `
    UPDATE addresses
    SET 
      contacted = 'true',
      contacted_at = CURRENT_TIMESTAMP
    WHERE (replied_rate > 0 OR following_count > 0)
      AND contacted = 'false'
  `;

  const params = [];

  if (source && source !== 'ALL') {
    query += " AND source = $1";
    params.push(source);
  }

  query += " RETURNING address, source, wallet_usd_value, contacted, contacted_at";

  const result = await pool.query(query, params);
  return result.rows;
};
