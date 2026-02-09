"use client";

import { useEffect, useState } from "react";
import {
  fetchNoActiveUsers,
  fetchFilters,
  fetchActiveUsers,
  updateActiveUsers,
} from "@/services/statsService";
import x from "../assets/x.png"

const PAGE_SIZE = 20;

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, any[]>>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | null>("wallet_usd_value");  // default active column in filter modal
  const [selectedFilters, setSelectedFilters] =useState<Record<string, any[]>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  //const [isSending, setIsSending] = useState(false);

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";
  }, []);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [statsData, filtersData] = await Promise.all([
          fetchNoActiveUsers(),
          fetchFilters(),
        ]);
        console.log("filtersData", filtersData);
        setStats(statsData);
        setFilters(filtersData);
        await loadUsers("ALL");
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadUsers = async (source: string) => {
    setIsLoading(true);
    try {
      // We must send an object { source: ["VALUE"] } to match your backend Logic
      const filterObj = source === "ALL" ? {} : { source: [source] };
      
      const data = await fetchActiveUsers(filterObj);
      setUsers(data || []);
      setPage(1);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setIsLoading(false);
    }
  };
  const loadUsersWithFilters = async (filters:any) => {
    setIsLoading(true);
    const data = await fetchActiveUsers(filters);
    setUsers(data);
    setPage(1);
    setIsLoading(false);
  };

// Improved range builder that handles edge cases properly
const buildRanges = (min: any, max: any, columnName: string) => {
  // Handle null/undefined/NaN cases
  const minIsValid = min != null && !isNaN(Number(min));
  const maxIsValid = max != null && !isNaN(Number(max));
  
  // If both are invalid, return empty array (we'll show "No data" message)
  if (!minIsValid && !maxIsValid) {
    return [];
  }
  
  // Convert to numbers
  const minNum = Number(min);
  const maxNum = Number(max);
  
  // If min equals max, return single value
  if (minNum === maxNum) {
    return [{
      min: minNum,
      max: maxNum,
      label: formatValue(minNum, columnName)
    }];
  }
  
  // Check if this is a date column
  const isDateColumn = columnName.includes('_at');
  
  if (isDateColumn) {
    return buildDateRanges(minNum, maxNum);
  }
  // RIGHT: Pass the raw strings directly from the API response
  if (columnName === "wallet_usd_value") {
    return buildNumericRanges(filters.wallet_usd_value_min, filters.wallet_usd_value_max);
  }
  return buildNumericRanges(minNum, maxNum);
};

const buildDateRanges = (min: number, max: number) => {
  const ranges = [];
  const minDate = new Date(min);
  const maxDate = new Date(max);
  
  // Calculate difference in days
  const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  
  let numBuckets = 10;
  if (diffDays < 30) numBuckets = 5;
  else if (diffDays < 365) numBuckets = 12;
  else numBuckets = 20;
  
  const step = (max - min) / numBuckets;
  
  for (let i = 0; i < numBuckets; i++) {
    const rangeMin = min + (step * i);
    const rangeMax = i === numBuckets - 1 ? max : min + (step * (i + 1));
    
    ranges.push({
      min: rangeMin,
      max: rangeMax,
      label: `${formatDate(rangeMin)} — ${formatDate(rangeMax)}`
    });
  }
  
  return ranges;
};

const buildNumericRanges = (min: any, max: any) => {
  // Capture the raw string IMMEDIATELY before any Number() conversion
  const rawMax = String(max); 

  const minNum = Number(min);
  const maxNum = Number(max);
  const range = maxNum - minNum;

  // Use Logarithmic if the scale is massive
  if (maxNum > 1000 && (maxNum / Math.max(minNum, 1)) > 100) {
      // Pass the RAW STRING to the next function
      return buildLogarithmicRanges(minNum, maxNum, rawMax);
  }

  // ... rest of your linear logic ...
  // Ensure the linear logic also uses toFullString for the output
  const ranges = [];
  let numBuckets = 10;
  const step = range / numBuckets;

  for (let i = 0; i < numBuckets; i++) {
    const rMin = minNum + (step * i);
    const rMax = i === numBuckets - 1 ? max : minNum + (step * (i + 1));
    
    ranges.push({
      min: toFullString(rMin),
      max: toFullString(rMax),
      label: `${formatNumber(rMin)} — ${formatNumber(Number(rMax))}`
    });
  }
  return ranges;
};

const toFullString = (val: any) => {
  if (val == null) return "0";
  
  const str = String(val);

  // If the string is already a long string of digits (no 'e'), leave it!
  if (!str.includes('e') && !str.includes('.')) {
    return str;
  }

  // If it is scientific notation or a float, use BigInt carefully
  try {
    const num = Number(val);
    if (Math.abs(num) < 1.0) return num.toFixed(20).replace(/\.?0+$/, "");
    return BigInt(Math.floor(num)).toString();
  } catch {
    return str;
  }
};

const buildLogarithmicRanges = (min: number, max: number, rawMaxStr: string) => {
  const ranges = [];
  let currentMin = min;
  let currentStep = min <= 0 ? 100 : Math.pow(10, Math.floor(Math.log10(min)));

  while (currentMin < max) {
    let nextMax = currentStep * 10;
    
    // If we've reached the end, don't do math. 
    // Use the exact string '866000000000000000000000'
    if (nextMax >= max || ranges.length >= 14) {
      ranges.push({
        min: toFullString(currentMin),
        max: rawMaxStr, // <--- THIS IS THE FIX
        label: `${formatNumber(currentMin)} — ${formatNumber(max)}`
      });
      break;
    }

    ranges.push({
      min: toFullString(currentMin),
      max: toFullString(nextMax),
      label: `${formatNumber(currentMin)} — ${formatNumber(nextMax)}`
    });

    currentMin = nextMax;
    currentStep = nextMax;
  }
  return ranges;
};

// Format numbers properly without excessive decimals
const formatNumber = (num: number) => {
  if (num == null || isNaN(num)) return 'N/A';
  if (num === 0) return '0';

  const absNum = Math.abs(num);

  // Added handling for Quadrillion (e15), Quintillion (e18), Sextillion (e21)
  if (absNum >= 1e21) return (num / 1e21).toFixed(1) + 'S'; // Sextillion
  if (absNum >= 1e18) return (num / 1e18).toFixed(1) + 'Qn'; // Quintillion
  if (absNum >= 1e15) return (num / 1e15).toFixed(1) + 'Q';  // Quadrillion
  if (absNum >= 1e12) return (num / 1e12).toFixed(1) + 'T';  // Trillion
  if (absNum >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';

  if (absNum < 1 && absNum > 0) return num.toFixed(4); // More precision for tiny decimals
  
  return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
};

// Format dates to readable format
const formatDate = (timestamp: number) => {
  if (!timestamp || isNaN(timestamp)) return 'N/A';
  
  const date = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format value based on column type
const formatValue = (val: any, columnName: string) => {
  if (val == null) return 'N/A';
  
  const num = Number(val);
  if (isNaN(num)) return 'N/A';
  
  if (columnName.includes('_at')) {
    return formatDate(num);
  }
  
  return formatNumber(num);
};

const normalizeFilters = (filters: any) => {
  const out: any = {};

  Object.entries(filters).forEach(([k, v]: any) => {
    // If it's a range and it's an array with at least one selection
    if (k.endsWith("_range") && Array.isArray(v) && v.length > 0) {
      out[k] = v; 
    } 
    // If it's a standard categorical filter (array of strings)
    else if (Array.isArray(v) && v.length > 0) {
      out[k] = v;
    }
  });

  return out;
};

const exportCSV = () => {
  if (!users.length) return;

  const headers = Object.keys(users[0]);

  const csvRows = [
    headers.join(","), // header row
    ...users.map(row =>
      headers.map(h => `"${row[h] ?? ""}"`).join(",")
    )
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "filtered_users.csv";
  a.click();

  window.URL.revokeObjectURL(url);
};

const filterColumns = Object.keys(filters).reduce((acc: string[], key) => {
  if (key.endsWith("_min")) {
    acc.push(key.replace("_min", ""));
  } else if (!key.endsWith("_max")) {
    acc.push(key);
  }
  return acc;
}, []);


/*   const handleMessageClick = async (source: string) => {
    setIsSending(true);
    try {
      await updateActiveUsers(source === "ALL" ? undefined : source);
      await loadUsers(source);
    } catch (err) {
      console.error("Failed to update users", err);
    } finally {
      setIsSending(false);
    }
  } */
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const currentRows = users.slice(start, start + PAGE_SIZE);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Users Dashboard</h1>
          <p style={styles.subtitle}>Manage and analyze your user base</p>
        </div>
        {stats && (
          <div style={styles.kpiContainer}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <span style={styles.kpiLabel}>Active Users</span>
                <span style={styles.kpiValue}>{stats.active_rows.toLocaleString()}</span>
              </div>
            </div>
            <div style={{...styles.kpiCard, borderLeft: "4px solid #10b981"}}>
              <div style={{...styles.kpiIcon, color: "#10b981"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
              </div>
              <div>
                <span style={styles.kpiLabel}>Total Users</span>
                <span style={styles.kpiValue}>{stats.total_rows.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      <div style={styles.filterSection}>
        <div style={styles.filterLeft}>
        </div>
        <div style={styles.filterRight}>
          <button onClick={exportCSV} style={styles.exportBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 8}}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export CSV
          </button>
          <button style={styles.filterBtn} onClick={() => setShowFilterModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 8}}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filters
            {Object.keys(selectedFilters).length > 0 && (
              <span style={styles.filterBadge}>{Object.keys(selectedFilters).length}</span>
            )}
          </button>
        </div>
      </div>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.centerContent}>
            <div className="spinner"></div>
            <p style={styles.loadingText}>Loading data...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={styles.centerContent}>
            <div style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{marginBottom: 20}}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 style={styles.emptyTitle}>No users found</h3>
              <p style={styles.emptyText}>Try adjusting your filters or search criteria</p>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Address</th>
                    <th style={styles.th}>Web3 ID</th>
                    <th style={styles.th}>Wallet USD Value</th>
                    <th style={styles.th}>TVF</th>
                    <th style={styles.th}>Replied Rate</th>
                    <th style={styles.th}>Follower Count</th>
                    <th style={styles.th}>Following Count</th>
                    <th style={styles.th}>Twitter ID</th>
                    <th style={styles.th}>Twitter Verified</th>
                    <th style={styles.th}>Telegram ID</th>
                    <th style={styles.th}>Discord ID</th>
                    <th style={styles.th}>Is VIP</th>
                    <th style={styles.th}>Rank At</th>
                    <th style={styles.th}>Rank Score</th>
                    <th style={styles.th}>Offer Price</th>
                    <th style={styles.th}>Initial Price</th>
                    <th style={styles.th}>Trust Count</th>
                    <th style={styles.th}>Reward</th>
                    <th style={styles.th}>Active VIP Days</th>
                    <th style={styles.th}>Uncharged Offer Count</th>
                    <th style={styles.th}>Uncharged Offer Value</th>
                    <th style={styles.th}>Unread Message Count</th>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Contacted</th>
                    <th style={styles.th}>Contacted At</th>
                    <th style={styles.th}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((u, i) => (
                    <tr key={i} style={styles.tr} className="table-row">
                      <td style={styles.tdAddress}>
                        <div style={styles.addressCell}>
                          <div style={styles.addressAvatar}>
                            {u.address.slice(2, 4).toUpperCase()}
                          </div>
                          <span>{u.address.slice(0, 6)}...{u.address.slice(-4)}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{u.web3_id || '—'}</td>
                      <td style={styles.tdMoney}>${parseFloat(u.wallet_usd_value).toLocaleString()}</td>
                      <td style={styles.td}>{u.tvf}</td>
                      <td style={styles.td}>
                        <div style={styles.percentBar}>
                          <div style={{...styles.percentFill, width: `${u.replied_rate}%`}}></div>
                          <span style={styles.percentText}>{u.replied_rate}%</span>
                        </div>
                      </td>
                      <td style={styles.td}>{u.follower_count.toLocaleString()}</td>
                      <td style={styles.td}>{u.following_count.toLocaleString()}</td>
                      <td style={styles.td}>{u.twitter_id || '—'}</td>
                      <td style={styles.td}>
                        {u.twitter_verified ? (
                          <span style={styles.verifiedBadge}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span style={styles.unverifiedBadge}>No</span>
                        )}
                      </td>
                      <td style={styles.td}>{u.telegram_id || '—'}</td>
                      <td style={styles.td}>{u.discord_id || '—'}</td>
                      <td style={styles.td}>
                        {u.is_vip ? (
                          <span style={styles.vipBadge}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4}}>
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            VIP
                          </span>
                        ) : (
                          <span style={styles.regularBadge}>Regular</span>
                        )}
                      </td>
                      <td style={styles.tdDate}>{new Date(u.rank_at).toLocaleDateString()}</td>
                      <td style={styles.td}>{u.rank_score}</td>
                      <td style={styles.tdMoney}>${parseFloat(u.offer_price).toLocaleString()}</td>
                      <td style={styles.tdMoney}>${parseFloat(u.initial_price).toLocaleString()}</td>
                      <td style={styles.td}>{u.trust_count}</td>
                      <td style={styles.tdMoney}>${parseFloat(u.reward).toLocaleString()}</td>
                      <td style={styles.td}>{u.active_vip_days}</td>
                      <td style={styles.td}>{u.uncharged_offer_count}</td>
                      <td style={styles.tdMoney}>${parseFloat(u.uncharged_offer_value).toLocaleString()}</td>
                      <td style={styles.td}>
                        {u.unread_message_count > 0 ? (
                          <span style={styles.unreadBadge}>{u.unread_message_count}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.sourceBadge}>{u.source}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={u.contacted ? styles.tagYes : styles.tagNo}>
                          {u.contacted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={styles.tdDate}>{u.contacted_at ? new Date(u.contacted_at).toLocaleDateString() : "—"}</td>
                      <td style={styles.tdDate}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <div style={styles.paginationInfo}>
                Showing <strong>{start + 1}</strong> to <strong>{Math.min(start + PAGE_SIZE, users.length)}</strong> of <strong>{users.length}</strong> results
              </div>
              <div style={styles.paginationControls}>
                <button 
                  style={page === 1 ? styles.pageBtnDisabled : styles.pageBtn} 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Previous
                </button>
                <div style={styles.pageNumbers}>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={i}
                        style={page === pageNum ? styles.pageNumActive : styles.pageNum}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button 
                  style={page === totalPages ? styles.pageBtnDisabled : styles.pageBtn} 
                  disabled={page === totalPages || totalPages === 0} 
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
        {showFilterModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>Filter Users</h2>
                </div>
                <button style={styles.closeBtn} onClick={() => setShowFilterModal(false)}>
                  <img src={x.src} alt="Close" width="16" height="16" />
                </button>
              </div>
              <div style={styles.columns}>
                {/* LEFT: columns */}
                <div style={styles.modalLeft}>
                  <div style={styles.filterListHeader}>Filter Categories</div>
                  {filterColumns.map((col) => (
                    <div
                      key={col}
                      className="filter-column-item"
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        background: activeColumn === col ? "#eff6ff" : "transparent",
                        borderLeft: activeColumn === col ? "3px solid #3b82f6" : "3px solid transparent",
                        transition: "all 0.2s ease",
                        fontSize: "14px",
                        fontWeight: activeColumn === col ? 600 : 400,
                        color: activeColumn === col ? "#1e40af" : "#475569"
                      }}
                      onClick={() => setActiveColumn(col)}
                    >
                      {col.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </div>
                  ))}
                </div>

                {/* RIGHT: values */}
                <div style={styles.modalRight}>
                  {activeColumn && (() => {
                    const minKey = `${activeColumn}_min`;
                    const maxKey = `${activeColumn}_max`;

                    /* RANGE COLUMN */
                    if (filters[minKey] !== undefined && filters[maxKey] !== undefined) {
                      const minVal = Array.isArray(filters[minKey]) ? filters[minKey][0] : filters[minKey];
                      const maxVal = Array.isArray(filters[maxKey]) ? filters[maxKey][0] : filters[maxKey];
                      
                      const ranges = buildRanges(minVal, maxVal, activeColumn);
                      
                      // If no valid ranges, show message
                      if (ranges.length === 0) {
                        return (
                          <div style={styles.noData}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <p>No data available</p>
                          </div>
                        );
                      }

                      return (
                        <div style={styles.filterOptionsContainer}>
                          <div style={styles.filterOptionsHeader}>
                            Select range{ranges.length > 1 ? 's' : ''}
                          </div>
                          {ranges.map((r, i) => {
                            const selected = selectedFilters?.[`${activeColumn}_range`] || [];

                            return (
                              <label 
                                key={i} 
                                style={styles.checkboxLabel}
                                className="checkbox-label"
                              >
                                <input
                                  type="checkbox"
                                  style={styles.checkbox}
                                  checked={selected.some((x: any) => x.min === r.min && x.max === r.max)}
                                  onChange={(e) => {
                                    const prev = selectedFilters?.[`${activeColumn}_range`] || [];

                                    const updated = e.target.checked
                                      ? [...prev, { min: r.min, max: r.max }]
                                      : prev.filter((x: any) => !(x.min === r.min && x.max === r.max));

                                    setSelectedFilters({
                                      ...selectedFilters,
                                      [`${activeColumn}_range`]: updated,
                                    });
                                  }}
                                />
                                <span style={styles.checkboxText}>{r.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    }

                    /* NORMAL DISTINCT VALUES */
                    const values = filters[activeColumn];
                    
                    // Filter out null/undefined/NaN and get unique values
                    const uniqueValues = values 
                      ? Array.from(new Set(values.filter((val: any) => {
                          if (val == null) return false;
                          if (typeof val === 'number' && isNaN(val)) return false;
                          return true;
                        })))
                      : [];
                    
                    if (uniqueValues.length === 0) {
                      return (
                        <div style={styles.noData}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          <p>No data available</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div style={styles.filterOptionsContainer}>
                        <div style={styles.filterOptionsHeader}>
                          Select value{uniqueValues.length > 1 ? 's' : ''}
                        </div>
                        {uniqueValues.map((val: any) => (
                          <label 
                            key={String(val)} 
                            style={styles.checkboxLabel}
                            className="checkbox-label"
                          >
                            <input
                              type="checkbox"
                              style={styles.checkbox}
                              checked={!!selectedFilters[activeColumn]?.includes(val)}
                              onChange={(e) => {
                                const prev = selectedFilters?.[activeColumn] || [];
                                const updated = e.target.checked
                                  ? [...prev, val]
                                  : prev.filter((v: any) => v !== val);

                                setSelectedFilters({
                                  ...selectedFilters,
                                  [activeColumn]: updated,
                                });
                              }}
                            />
                            <span style={styles.checkboxText}>{String(val)}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* footer */}
              <div style={styles.modalFooter}>
                <button
                  style={styles.clearBtn}
                  onClick={() => {
                    setSelectedFilters({});
                  }}
                >
                  Clear All
                </button>
                <button
                  style={styles.applyBtn}
                  onClick={() => {
                    loadUsersWithFilters(normalizeFilters(selectedFilters));
                    setShowFilterModal(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      <style jsx>{`
        .spinner {
          border: 4px solid #e0e7ff;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <style>{`
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }

        .filter-column-item:hover {
          background-color: #f0f9ff !important; 
        }

        .table-row:hover {
          background-color: #f8fafc !important;
          transition: background-color 0.15s ease;
        }

        .checkbox-label:hover {
          background-color: #f8fafc !important;
        }

        input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
          accent-color: #3b82f6;
        }

        input[type="text"]:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "100%",
    margin: "0 auto",
    padding: "40px 60px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    color: "#1e293b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "40px",
    flexWrap: "wrap",
    gap: "30px",
  },
  title: { 
    fontSize: "2.5rem", 
    fontWeight: 800, 
    color: "#0f172a", 
    margin: 0,
    letterSpacing: "-0.02em",
    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#64748b",
    margin: "8px 0 0 0",
    fontWeight: 400,
  },
  kpiContainer: { 
    display: "flex", 
    gap: "20px",
  },
  kpiCard: {
    backgroundColor: "#fff",
    padding: "24px 28px",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 24px rgba(0, 0, 0, 0.05)",
    borderLeft: "4px solid #3b82f6",
    display: "flex",
    gap: "16px",
    alignItems: "center",
    minWidth: "200px",
    transition: "all 0.3s ease",
  },
  kpiIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
  },
  kpiLabel: { 
    fontSize: "0.875rem", 
    color: "#64748b", 
    fontWeight: 500,
    display: "block",
    marginBottom: "4px",
  },
  kpiValue: { 
    fontSize: "1.75rem", 
    fontWeight: 700, 
    color: "#0f172a",
    display: "block",
  },
  filterSection: {
    marginBottom: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },
  filterLeft: {
    flex: 1,
  },
  filterRight: {
    display: "flex",
    gap: "12px",
  },
  searchContainer: {
    position: "relative",
    maxWidth: "400px",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 44px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#fff",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  exportBtn: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "2px solid #10b981",
    backgroundColor: "#fff",
    color: "#10b981",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  filterBtn: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    position: "relative",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  filterBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    backgroundColor: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    border: "2px solid #fff",
  },
  main: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 20px 40px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
  },
  tableWrapper: { 
    overflowX: "auto",
    flex: 1,
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse", 
    textAlign: "left",
  },
  tableHeaderRow: { 
    backgroundColor: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  },
  th: { 
    padding: "18px 20px", 
    color: "#475569", 
    fontWeight: 700, 
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  td: { 
    padding: "18px 20px", 
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.95rem",
    color: "#334155",
  },
  tdAddress: { 
    padding: "18px 20px", 
    borderBottom: "1px solid #f1f5f9",
  },
  addressCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  addressAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#3b82f6",
  },
  tdMoney: {
    padding: "18px 20px", 
    borderBottom: "1px solid #f1f5f9",
    fontWeight: 600,
    color: "#0f172a",
    fontVariantNumeric: "tabular-nums",
  },
  tdDate: {
    padding: "18px 20px", 
    borderBottom: "1px solid #f1f5f9",
    color: "#64748b",
    fontSize: "0.9rem",
  },
  percentBar: {
    position: "relative",
    width: "100px",
    height: "24px",
    backgroundColor: "#f1f5f9",
    borderRadius: "6px",
    overflow: "hidden",
  },
  percentFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    backgroundColor: "#3b82f6",
    transition: "width 0.3s ease",
  },
  percentText: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#0f172a",
    zIndex: 1,
  },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  unverifiedBadge: {
    display: "inline-block",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  vipBadge: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  regularBadge: {
    display: "inline-block",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  unreadBadge: {
    display: "inline-block",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 700,
    minWidth: "28px",
    textAlign: "center",
  },
  sourceBadge: {
    display: "inline-block",
    backgroundColor: "#ede9fe",
    color: "#6b21a8",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    animation: "fadeIn 0.2s ease",
  },
  modal: {
    background: "#fff",
    width: "900px",
    maxWidth: "90vw",
    height: "600px",
    maxHeight: "85vh",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    animation: "slideUp 0.3s ease",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "28px 32px",
    borderBottom: "2px solid #f1f5f9",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  modalSubtitle: {
    fontSize: "0.9rem",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  closeBtn: {
    padding: "10px",
    cursor: "pointer",
    backgroundColor: "#f8fafc",
    border: "none",
    borderRadius: "10px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  columns: { 
    display: "flex", 
    flex: 1, 
    overflow: "hidden",
  },
  modalLeft: {
    width: "35%",
    borderRight: "2px solid #f1f5f9",
    overflowY: "auto",
    backgroundColor: "#fafbfc",
  },
  filterListHeader: {
    padding: "16px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
  },
  modalRight: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "#fff",
  },
  filterOptionsContainer: {
    padding: "20px",
  },
  filterOptionsHeader: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#475569",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "2px solid #f1f5f9",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
    cursor: "pointer",
    borderRadius: "10px",
    marginBottom: "6px",
    transition: "all 0.15s ease",
  },
  checkbox: {
    marginRight: "12px",
  },
  checkboxText: {
    fontSize: "0.95rem",
    color: "#334155",
    fontWeight: 500,
  },
  noData: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "#94a3b8",
    textAlign: "center",
  },
  modalFooter: {
    padding: "20px 32px",
    borderTop: "2px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: "#fafbfc",
  },
  clearBtn: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#fff",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  applyBtn: {
    padding: "12px 32px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  tr: { 
    transition: "background-color 0.15s ease",
  },
  tagYes: { 
    backgroundColor: "#dcfce7", 
    color: "#166534", 
    padding: "6px 12px", 
    borderRadius: "8px", 
    fontSize: "0.8rem", 
    fontWeight: 600,
    display: "inline-block",
  },
  tagNo: { 
    backgroundColor: "#fee2e2", 
    color: "#991b1b", 
    padding: "6px 12px", 
    borderRadius: "8px", 
    fontSize: "0.8rem", 
    fontWeight: 600,
    display: "inline-block",
  },
  centerContent: { 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    flex: 1, 
    padding: "80px",
  },
  loadingText: {
    color: "#3b82f6",
    marginTop: "16px",
    fontSize: "1rem",
    fontWeight: 500,
  },
  emptyState: { 
    textAlign: "center",
    maxWidth: "400px",
  },
  emptyTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "8px",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "1rem",
  },
  pagination: { 
    padding: "28px 32px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    borderTop: "2px solid #f1f5f9",
    backgroundColor: "#fafbfc",
  },
  paginationInfo: {
    fontSize: "0.95rem",
    color: "#64748b",
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  pageBtn: { 
    padding: "10px 20px", 
    borderRadius: "10px", 
    border: "2px solid #e2e8f0", 
    backgroundColor: "#fff", 
    color: "#475569", 
    cursor: "pointer", 
    fontWeight: 600,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  pageBtnDisabled: { 
    padding: "10px 20px", 
    borderRadius: "10px", 
    border: "2px solid #f1f5f9", 
    backgroundColor: "#f8fafc", 
    color: "#cbd5e1", 
    cursor: "not-allowed",
    fontWeight: 600,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "inherit",
  },
  pageNumbers: {
    display: "flex",
    gap: "6px",
  },
  pageNum: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#fff",
    color: "#475569",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  pageNumActive: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "2px solid #3b82f6",
    backgroundColor: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
};
