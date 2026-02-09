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
exports.getActiveUsers = async (filters = {}) => {

  let query = `
    SELECT *
    FROM addresses
    WHERE (replied_rate > 0 OR following_count > 0)
  `;

  const values = [];
  let index = 1;

  Object.entries(filters).forEach(([column, vals]) => {
    if (vals.length > 0) {
      query += ` AND ${column} = ANY($${index})`;
      values.push(vals);
      index++;
    }
  });

  const result = await pool.query(query, values);
  return result.rows;
};


/* 3 */
exports.getFilters = async () => {
  const result = await pool.query(`
    SELECT
      array_agg(DISTINCT tvf) AS tvf,
      array_agg(DISTINCT replied_rate) AS replied_rate,
      array_agg(DISTINCT follower_count) AS follower_count,
      array_agg(DISTINCT following_count) AS following_count,
      array_agg(DISTINCT twitter_verified) AS twitter_verified,
      array_agg(DISTINCT is_vip) AS is_vip,
      array_agg(DISTINCT rank_at) AS rank_at,
      array_agg(DISTINCT rank_score) AS rank_score,
      array_agg(DISTINCT offer_price) AS offer_price,
      array_agg(DISTINCT initial_price) AS initial_price,
      array_agg(DISTINCT trust_count) AS trust_count,
      array_agg(DISTINCT reward) AS reward,
      array_agg(DISTINCT active_vip_days) AS active_vip_days,
      array_agg(DISTINCT uncharged_offer_count) AS uncharged_offer_count,
      array_agg(DISTINCT uncharged_offer_value) AS uncharged_offer_value,
      array_agg(DISTINCT unread_message_count) AS unread_message_count,
      array_agg(DISTINCT source) AS source,
      array_agg(DISTINCT contacted) AS contacted
    FROM addresses
  `);

  return result.rows[0];
};


/* 4 */
/* exports.updateActiveUsers = async (source) => {
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
 */