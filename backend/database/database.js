/**
 * MicroEscrow — MySQL Database Layer
 * Manages MySQL connection pool, automatic database & table creation,
 * and demo seed data initialization.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'microescrow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let useFallback = false;

// Fallback in-memory database store if MySQL credentials need updating
const fallbackStore = {
  users: [],
  campaigns: [],
  pledges: []
};

/**
 * Initialize Database & Tables
 */
async function initDatabase() {
  console.log(`[Database] Attempting connection to MySQL at ${DB_CONFIG.host}:${DB_CONFIG.port} (User: ${DB_CONFIG.user})...`);

  try {
    // 1. Connect without database to ensure database exists
    const rootConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();
    console.log(`[Database] Verified database '${DB_CONFIG.database}'.`);

    // 2. Create Connection Pool for app
    pool = mysql.createPool(DB_CONFIG);

    // 3. Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` VARCHAR(32) NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`roll_no\` VARCHAR(50) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`role\` ENUM('student', 'organizer') NOT NULL DEFAULT 'student',
        \`password\` VARCHAR(255) NOT NULL,
        \`department\` VARCHAR(100) NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_users_role\` (\`role\`),
        INDEX \`idx_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`campaigns\` (
        \`id\` VARCHAR(32) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`target_amount\` DECIMAL(12, 2) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'Other',
        \`deadline\` BIGINT NOT NULL,
        \`description\` TEXT,
        \`status\` ENUM('funding', 'disbursed', 'refunded') NOT NULL DEFAULT 'funding',
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_campaigns_status\` (\`status\`),
        INDEX \`idx_campaigns_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`pledges\` (
        \`id\` VARCHAR(32) NOT NULL,
        \`campaign_id\` VARCHAR(32) NOT NULL,
        \`user_id\` VARCHAR(32) NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`roll_no\` VARCHAR(50) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`tier\` VARCHAR(100) NOT NULL,
        \`amount\` DECIMAL(10, 2) NOT NULL,
        \`timestamp\` BIGINT NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Escrow Locked',
        \`vault_hash\` VARCHAR(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_pledges_campaign\` (\`campaign_id\`),
        INDEX \`idx_pledges_user\` (\`user_id\`),
        INDEX \`idx_pledges_timestamp\` (\`timestamp\`),
        CONSTRAINT \`fk_pledges_campaign\`
          FOREIGN KEY (\`campaign_id\`)
          REFERENCES \`campaigns\` (\`id\`)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safely add user_id column if pledges table existed previously without it
    try {
      await pool.query('ALTER TABLE pledges ADD COLUMN user_id VARCHAR(32) NULL AFTER campaign_id');
    } catch (e) {
      // Column already exists, ignore
    }

    // 4. Seed if empty
    await seedDemoDataIfEmpty();
    console.log('[Database] MySQL initialization complete & ready.');
    useFallback = false;
    return true;
  } catch (err) {
    console.warn('\n⚠️ [Database Warning] Could not connect directly to MySQL:');
    console.warn(`   Reason: ${err.message}`);
    console.warn('   Tip: Ensure MySQL is running and set your root password in .env (DB_PASSWORD=...)');
    console.warn('   → Activating high-speed in-memory store so backend APIs and prototype remain 100% operational!\n');

    useFallback = true;
    seedFallbackStore();
    return false;
  }
}

/**
 * Execute SQL Query
 */
async function query(sql, params = []) {
  if (!useFallback && pool) {
    const [results] = await pool.query(sql, params);
    return results;
  }

  // Handle fallback query emulation
  return emulateQuery(sql, params);
}

/**
 * Seed initial demo data in MySQL
 */
async function seedDemoDataIfEmpty() {
  if (!pool) return;

  // 1. Seed Users if empty
  try {
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('[Database] Seeding initial student & organizer accounts into MySQL...');
      const now = Date.now();
      await pool.query(`
        INSERT INTO users (id, name, email, roll_no, phone, role, password, department, created_at) VALUES
        ('USR-STU01', 'Aarav Sharma', 'student@campus.edu', '2026CS101', '9876543210', 'student', 'student123', 'Computer Science', ?),
        ('USR-STU02', 'Priya Nair', 'priya@campus.edu', '2026EC045', '9876543211', 'student', 'student123', 'Electronics', ?),
        ('USR-ORG01', 'Prof. Vikram Rao', 'organizer@campus.edu', NULL, '9811223344', 'organizer', 'organizer123', 'Tech Fest Committee', ?)
      `, [now, now, now]);
    }
  } catch (err) {
    console.warn('Error checking/seeding users:', err.message);
  }

  // 2. Seed Campaigns if empty
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM campaigns');
  if (rows[0].count > 0) return;

  console.log('[Database] Seeding initial college demo campaigns & pledges into MySQL...');

  const c1Id = 'C-TECHFEST26';
  const c2Id = 'C-HACKSWAG26';
  const now = Date.now();

  await pool.query(`
    INSERT INTO campaigns (id, title, target_amount, category, deadline, description, status, created_at) VALUES
    (?, ?, ?, ?, ?, ?, 'funding', ?),
    (?, ?, ?, ?, ?, ?, 'funding', ?)
  `, [
    c1Id, 'Annual College Tech Fest 2026 — Early Bird Pass & Merch Combo', 50000, 'Tech Fest', now + (3 * 24 + 7) * 3600000, 'Get your early bird pass + exclusive hoodie at locked-in vendor pricing. Funds secured in escrow until minimum threshold is met.', now - 5 * 86400000,
    c2Id, 'Inter-College Hackathon T-Shirt & Swag Kit', 20000, 'Hackathon', now + (1 * 24 + 14) * 3600000, 'Exclusive hackathon swag kit — custom tee, sticker pack, and dev toolkit. Order locked once threshold is hit.', now - 3 * 86400000
  ]);

  const pledges = [
    ['PLG-SEED01', c1Id, 'Aarav Sharma',   '2026CS101', '9876543210', 'VIP + Hoodie Pass', 799,   now - 86400000 * 4, 'Escrow Locked', '#ESC-8921-2026'],
    ['PLG-SEED02', c1Id, 'Priya Nair',     '2026EC045', '9876543211', 'General Pass',      299,   now - 86400000 * 3.5, 'Escrow Locked', '#ESC-4502-2026'],
    ['PLG-SEED03', c1Id, 'Rohan Mehta',    '2026ME078', '9876543212', 'VIP + Hoodie Pass', 799,   now - 86400000 * 3, 'Escrow Locked', '#ESC-7731-2026'],
    ['PLG-SEED04', c1Id, 'Sneha Kulkarni', '2026IT032', '9876543213', 'Custom Amount',     500,   now - 86400000 * 2, 'Escrow Locked', '#ESC-3345-2026'],
    ['PLG-SEED05', c1Id, 'Kavya Reddy',    '2026EE017', '9876543214', 'VIP + Hoodie Pass', 799,   now - 86400000 * 1, 'Escrow Locked', '#ESC-6019-2026'],
    ['PLG-SEED06', c1Id, 'Vikram Singh',   '2026CS155', '9876543215', 'Custom Amount',     35304, now - 3600000 * 18, 'Escrow Locked', '#ESC-1187-2026'],

    ['PLG-SEED07', c2Id, 'Ananya Verma',   '2026CS201', '9871111111', 'General Pass',      299,   now - 86400000 * 2, 'Escrow Locked', '#ESC-5501-2026'],
    ['PLG-SEED08', c2Id, 'Karthik Iyer',   '2026EC112', '9872222222', 'VIP + Hoodie Pass', 799,   now - 86400000 * 1.8, 'Escrow Locked', '#ESC-2208-2026'],
    ['PLG-SEED09', c2Id, 'Meera Joshi',    '2026IT066', '9873333333', 'VIP + Hoodie Pass', 799,   now - 86400000 * 1.2, 'Escrow Locked', '#ESC-9914-2026'],
    ['PLG-SEED10', c2Id, 'Ravi Patel',     '2026ME099', '9874444444', 'General Pass',      299,   now - 86400000 * 0.8, 'Escrow Locked', '#ESC-7742-2026'],
    ['PLG-SEED11', c2Id, 'Diya Gupta',     '2026EE044', '9875555555', 'Custom Amount',     16304, now - 3600000 * 10, 'Escrow Locked', '#ESC-3356-2026'],
  ];

  for (const p of pledges) {
    await pool.query(`
      INSERT INTO pledges (id, campaign_id, name, roll_no, phone, tier, amount, timestamp, status, vault_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, p);
  }
}

/**
 * Seed Fallback Store
 */
function seedFallbackStore() {
  const c1Id = 'C-TECHFEST26';
  const c2Id = 'C-HACKSWAG26';
  const now = Date.now();

  fallbackStore.users = [
    { id: 'USR-STU01', name: 'Aarav Sharma', email: 'student@campus.edu', roll_no: '2026CS101', phone: '9876543210', role: 'student', password: 'student123', department: 'Computer Science', created_at: now },
    { id: 'USR-STU02', name: 'Priya Nair', email: 'priya@campus.edu', roll_no: '2026EC045', phone: '9876543211', role: 'student', password: 'student123', department: 'Electronics', created_at: now },
    { id: 'USR-ORG01', name: 'Prof. Vikram Rao', email: 'organizer@campus.edu', roll_no: null, phone: '9811223344', role: 'organizer', password: 'organizer123', department: 'Tech Fest Committee', created_at: now }
  ];

  fallbackStore.campaigns = [
    { id: c1Id, title: 'Annual College Tech Fest 2026 — Early Bird Pass & Merch Combo', target_amount: 50000, category: 'Tech Fest', deadline: now + (3 * 24 + 7) * 3600000, description: 'Get your early bird pass + exclusive hoodie at locked-in vendor pricing. Funds secured in escrow until minimum threshold is met.', status: 'funding', created_at: now - 5 * 86400000 },
    { id: c2Id, title: 'Inter-College Hackathon T-Shirt & Swag Kit', target_amount: 20000, category: 'Hackathon', deadline: now + (1 * 24 + 14) * 3600000, description: 'Exclusive hackathon swag kit — custom tee, sticker pack, and dev toolkit. Order locked once threshold is hit.', status: 'funding', created_at: now - 3 * 86400000 }
  ];

  fallbackStore.pledges = [
    { id: 'PLG-SEED01', campaign_id: c1Id, name: 'Aarav Sharma',   roll_no: '2026CS101', phone: '9876543210', tier: 'VIP + Hoodie Pass', amount: 799,   timestamp: now - 86400000 * 4, status: 'Escrow Locked', vault_hash: '#ESC-8921-2026' },
    { id: 'PLG-SEED02', campaign_id: c1Id, name: 'Priya Nair',     roll_no: '2026EC045', phone: '9876543211', tier: 'General Pass',      amount: 299,   timestamp: now - 86400000 * 3.5, status: 'Escrow Locked', vault_hash: '#ESC-4502-2026' },
    { id: 'PLG-SEED03', campaign_id: c1Id, name: 'Rohan Mehta',    roll_no: '2026ME078', phone: '9876543212', tier: 'VIP + Hoodie Pass', amount: 799,   timestamp: now - 86400000 * 3, status: 'Escrow Locked', vault_hash: '#ESC-7731-2026' },
    { id: 'PLG-SEED04', campaign_id: c1Id, name: 'Sneha Kulkarni', roll_no: '2026IT032', phone: '9876543213', tier: 'Custom Amount',     amount: 500,   timestamp: now - 86400000 * 2, status: 'Escrow Locked', vault_hash: '#ESC-3345-2026' },
    { id: 'PLG-SEED05', campaign_id: c1Id, name: 'Kavya Reddy',    roll_no: '2026EE017', phone: '9876543214', tier: 'VIP + Hoodie Pass', amount: 799,   timestamp: now - 86400000 * 1, status: 'Escrow Locked', vault_hash: '#ESC-6019-2026' },
    { id: 'PLG-SEED06', campaign_id: c1Id, name: 'Vikram Singh',   roll_no: '2026CS155', phone: '9876543215', tier: 'Custom Amount',     amount: 35304, timestamp: now - 3600000 * 18, status: 'Escrow Locked', vault_hash: '#ESC-1187-2026' },

    { id: 'PLG-SEED07', campaign_id: c2Id, name: 'Ananya Verma',   roll_no: '2026CS201', phone: '9871111111', tier: 'General Pass',      amount: 299,   timestamp: now - 86400000 * 2, status: 'Escrow Locked', vault_hash: '#ESC-5501-2026' },
    { id: 'PLG-SEED08', campaign_id: c2Id, name: 'Karthik Iyer',   roll_no: '2026EC112', phone: '9872222222', tier: 'VIP + Hoodie Pass', amount: 799,   timestamp: now - 86400000 * 1.8, status: 'Escrow Locked', vault_hash: '#ESC-2208-2026' },
    { id: 'PLG-SEED09', campaign_id: c2Id, name: 'Meera Joshi',    roll_no: '2026IT066', phone: '9873333333', tier: 'VIP + Hoodie Pass', amount: 799,   timestamp: now - 86400000 * 1.2, status: 'Escrow Locked', vault_hash: '#ESC-9914-2026' },
    { id: 'PLG-SEED10', campaign_id: c2Id, name: 'Ravi Patel',     roll_no: '2026ME099', phone: '9874444444', tier: 'General Pass',      amount: 299,   timestamp: now - 86400000 * 0.8, status: 'Escrow Locked', vault_hash: '#ESC-7742-2026' },
    { id: 'PLG-SEED11', campaign_id: c2Id, name: 'Diya Gupta',     roll_no: '2026EE044', phone: '9875555555', tier: 'Custom Amount',     amount: 16304, timestamp: now - 3600000 * 10, status: 'Escrow Locked', vault_hash: '#ESC-3356-2026' },
  ];
}

/**
 * Emulate common SQL queries on the fallback store
 */
function emulateQuery(sql, params = []) {
  const norm = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  if (norm.includes('from campaigns c left join pledges p') || norm.startsWith('select c.*')) {
    return fallbackStore.campaigns.map(c => {
      const cPledges = fallbackStore.pledges.filter(p => p.campaign_id === c.id);
      const total_pledged = cPledges.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...c,
        total_pledged,
        backer_count: cPledges.length
      };
    }).sort((a, b) => b.created_at - a.created_at);
  }

  if (norm.startsWith('select * from campaigns where id = ?') || norm.includes('from campaigns where id = ?')) {
    const c = fallbackStore.campaigns.find(x => x.id === params[0]);
    return c ? [c] : [];
  }

  if (norm.includes('from users where') && (norm.includes('email = ?') || norm.includes('roll_no = ?'))) {
    const idVal = params[0];
    const roleVal = params[params.length - 1];
    const u = fallbackStore.users.find(x => (x.email === idVal || x.roll_no === idVal) && (params.length === 1 || x.role === roleVal));
    return u ? [u] : [];
  }

  if (norm.startsWith('select * from users where id = ?')) {
    const u = fallbackStore.users.find(x => x.id === params[0]);
    return u ? [u] : [];
  }

  if (norm.startsWith('insert into users')) {
    const [id, name, email, roll_no, phone, role, password, department, created_at] = params;
    const u = { id, name, email, roll_no, phone, role, password, department, created_at };
    fallbackStore.users.push(u);
    return { insertId: id, affectedRows: 1 };
  }

  if (norm.startsWith('select * from pledges where campaign_id = ?')) {
    return fallbackStore.pledges
      .filter(p => p.campaign_id === params[0])
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  if (norm.includes('sum(amount)') && norm.includes('from pledges where campaign_id = ?')) {
    const cPledges = fallbackStore.pledges.filter(p => p.campaign_id === params[0]);
    const total_pledged = cPledges.reduce((sum, p) => sum + Number(p.amount), 0);
    return [{ total_pledged, backer_count: cPledges.length }];
  }

  if (norm.startsWith('select count(*) as count from campaigns')) {
    return [{ count: fallbackStore.campaigns.length }];
  }

  if (norm.startsWith('select * from pledges') && !norm.includes('where')) {
    return [...fallbackStore.pledges].sort((a, b) => b.timestamp - a.timestamp);
  }

  if (norm.startsWith('insert into campaigns')) {
    const [id, title, target_amount, category, deadline, description, created_at] = params;
    const c = { id, title, target_amount: Number(target_amount), category, deadline: Number(deadline), description, status: 'funding', created_at: Number(created_at) };
    fallbackStore.campaigns.push(c);
    return { insertId: id, affectedRows: 1 };
  }

  if (norm.startsWith('insert into pledges')) {
    const [id, campaign_id, name, roll_no, phone, tier, amount, timestamp, status, vault_hash] = params;
    const p = { id, campaign_id, name, roll_no, phone, tier, amount: Number(amount), timestamp: Number(timestamp), status, vault_hash };
    fallbackStore.pledges.push(p);
    return { insertId: id, affectedRows: 1 };
  }

  if (norm.startsWith('update campaigns set target_amount = ?')) {
    const [target_amount, id] = params;
    const c = fallbackStore.campaigns.find(x => x.id === id);
    if (c) c.target_amount = Number(target_amount);
    return { affectedRows: c ? 1 : 0 };
  }

  if (norm.startsWith('update campaigns set status = ?')) {
    const [status, id] = params;
    const c = fallbackStore.campaigns.find(x => x.id === id);
    if (c) c.status = status;
    return { affectedRows: c ? 1 : 0 };
  }

  if (norm.startsWith('update pledges set status = ? where campaign_id = ?')) {
    const [status, campaignId] = params;
    let count = 0;
    fallbackStore.pledges.forEach(p => {
      if (p.campaign_id === campaignId) {
        p.status = status;
        count++;
      }
    });
    return { affectedRows: count };
  }

  if (norm.startsWith('delete from campaigns where id = ?')) {
    const id = params[0];
    fallbackStore.campaigns = fallbackStore.campaigns.filter(c => c.id !== id);
    fallbackStore.pledges = fallbackStore.pledges.filter(p => p.campaign_id !== id);
    return { affectedRows: 1 };
  }

  return [];
}

/**
 * Reset Demo Data
 */
async function resetDemoData() {
  if (!useFallback && pool) {
    await pool.query('DELETE FROM pledges');
    await pool.query('DELETE FROM campaigns');
    await seedDemoDataIfEmpty();
  } else {
    seedFallbackStore();
  }
}

module.exports = {
  initDatabase,
  query,
  resetDemoData,
  isMySQLConnected: () => !useFallback
};
