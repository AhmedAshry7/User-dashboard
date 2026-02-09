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

  Object.entries(filters).forEach(([column, val]) => {
    if (column.endsWith("_range") && Array.isArray(val) && val.length > 0) {
      const realColumn = column.replace("_range", "");
      
      // Create a group of OR conditions for each selected range
      const rangeConditions = [];

      val.forEach((range) => {
        // Ensure we are working with strings to avoid scientific notation issues
        const minStr = String(range.min);
        const maxStr = String(range.max);

        if (minStr !== 'undefined' && maxStr !== 'undefined') {
          // Explicitly cast to numeric to handle exact precision matching
          rangeConditions.push(`${realColumn}::numeric BETWEEN $${index}::numeric AND $${index + 1}::numeric`);
          values.push(minStr, maxStr);
          index += 2;
        }
      });

      if (rangeConditions.length > 0) {
        // Wrap the OR conditions in parentheses so they don't break the rest of the WHERE clause
        query += ` AND (${rangeConditions.join(" OR ")})`;
      }
  }

    /* IN filters (Categorical values like 'source')
    */
    else if (Array.isArray(val) && val.length > 0) {
      // Ensure we don't treat the range array as an IN filter
      if (!column.endsWith("_range")) {
        query += ` AND ${column} = ANY($${index})`;
        values.push(val);
        index++;
      }
    }
  });

  const result = await pool.query(query, values);
  return result.rows;
};


/* 3 */
exports.getFilters = async () => {
  const result = await pool.query(`
    SELECT
      /* numeric ranges */
      MIN(wallet_usd_value)::text AS wallet_usd_value_min,
      MAX(wallet_usd_value)::text AS wallet_usd_value_max,

      MIN(replied_rate) AS replied_rate_min,
      MAX(replied_rate) AS replied_rate_max,

      MIN(follower_count) AS follower_count_min,
      MAX(follower_count) AS follower_count_max,

      MIN(following_count) AS following_count_min,
      MAX(following_count) AS following_count_max,


      MIN(rank_score) AS rank_score_min,
      MAX(rank_score) AS rank_score_max,

      MIN(offer_price) AS offer_price_min,
      MAX(offer_price) AS offer_price_max,

      MIN(initial_price) AS initial_price_min,
      MAX(initial_price) AS initial_price_max,

      MIN(trust_count) AS trust_count_min,
      MAX(trust_count) AS trust_count_max,

      MIN(reward) AS reward_min,
      MAX(reward) AS reward_max,

      MIN(active_vip_days) AS active_vip_days_min,
      MAX(active_vip_days) AS active_vip_days_max,

      MIN(uncharged_offer_count) AS uncharged_offer_count_min,
      MAX(uncharged_offer_count) AS uncharged_offer_count_max,

      MIN(uncharged_offer_value) AS uncharged_offer_value_min,
      MAX(uncharged_offer_value) AS uncharged_offer_value_max,

      MIN(unread_message_count) AS unread_message_count_min,
      MAX(unread_message_count) AS unread_message_count_max,

      EXTRACT(EPOCH FROM (MIN(contacted_at)::timestamp)) * 1000 AS contacted_at_min,
      EXTRACT(EPOCH FROM (MAX(contacted_at)::timestamp)) * 1000 AS contacted_at_max,

      EXTRACT(EPOCH FROM (MIN(created_at)::timestamp)) * 1000 AS created_at_min,
      EXTRACT(EPOCH FROM (MAX(created_at)::timestamp)) * 1000 AS created_at_max,
      
      /* small cardinality columns - filter nulls */
      array_remove(array_agg(DISTINCT tvf), NULL) AS tvf,
      array_remove(array_agg(DISTINCT twitter_verified), NULL) AS twitter_verified,
      array_remove(array_agg(DISTINCT is_vip), NULL) AS is_vip,
      array_remove(array_agg(DISTINCT source), NULL) AS source,
      array_remove(array_agg(DISTINCT contacted), NULL) AS contacted
    FROM addresses
    WHERE (replied_rate > 0 OR following_count > 0)
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