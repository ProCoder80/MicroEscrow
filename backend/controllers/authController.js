/**
 * MicroEscrow — Authentication & Authorization Controller
 * Handles role-based authentication (Student vs Organizer), registration, and profile queries
 */

const db = require('../database/database');

function genUserId(role = 'student') {
  const prefix = role === 'organizer' ? 'USR-ORG' : 'USR-STU';
  return prefix + Math.floor(1000 + Math.random() * 9000);
}

/**
 * Format user row for API response (strips sensitive fields)
 */
function formatUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    rollNo: u.roll_no || '',
    phone: u.phone || '',
    role: u.role,
    department: u.department || '',
    createdAt: Number(u.created_at)
  };
}

/**
 * POST /api/auth/login
 * Role-based login (Student vs Organizer)
 */
async function login(req, res) {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Identifier (Email or Roll No), password, and role are required.'
      });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();

    // Query user by email or roll_no matching the role
    const users = await db.query(
      'SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(roll_no) = ?) AND role = ?',
      [cleanId, cleanId, cleanRole]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: `No ${cleanRole} account found matching "${identifier}". Please check your credentials or register.`
      });
    }

    const user = users[0];

    // Verify password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.'
      });
    }

    // Generate session token
    const token = 'ME_AUTH_' + Buffer.from(`${user.id}:${user.role}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      message: `Welcome back, ${user.name}! Authenticated as ${user.role}.`,
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/auth/register
 * New Student or Organizer registration
 */
async function register(req, res) {
  try {
    const { name, email, rollNo, phone, role, password, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and role are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role === 'organizer' ? 'organizer' : 'student';

    // Check if email already exists
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    const id = genUserId(cleanRole);
    const now = Date.now();
    const cleanRoll = rollNo ? rollNo.trim().toUpperCase() : null;

    await db.query(`
      INSERT INTO users (id, name, email, roll_no, phone, role, password, department, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name.trim(),
      cleanEmail,
      cleanRoll,
      phone ? phone.trim() : null,
      cleanRole,
      password,
      department ? department.trim() : null,
      now
    ]);

    const created = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    const user = created[0];
    const token = 'ME_AUTH_' + Buffer.from(`${user.id}:${user.role}:${now}`).toString('base64');

    res.status(201).json({
      success: true,
      message: `Account created successfully! Logged in as ${user.role}.`,
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/auth/me/:id
 * Retrieve current user profile
 */
async function getMe(req, res) {
  try {
    const { id } = req.params;
    const users = await db.query('SELECT * FROM users WHERE id = ?', [id]);

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({ success: true, user: formatUser(users[0]) });
  } catch (err) {
    console.error('Error retrieving user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/auth/my-pledges/:userId
 * Retrieve pledges created by this student user in real time
 */
async function getMyPledges(req, res) {
  try {
    const { userId } = req.params;
    const userRows = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const student = userRows[0];

    // Fetch pledges matching student user_id or roll_no
    const pledges = await db.query(`
      SELECT p.*, c.title AS campaign_title, c.category AS campaign_category
      FROM pledges p
      LEFT JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.user_id = ? OR (p.roll_no = ? AND ? IS NOT NULL)
      ORDER BY p.timestamp DESC
    `, [student.id, student.roll_no, student.roll_no]);

    res.json({
      success: true,
      data: pledges.map(p => ({
        id: p.id,
        campaignId: p.campaign_id,
        campaignTitle: p.campaign_title || 'Campus Campaign',
        campaignCategory: p.campaign_category || 'Event',
        tier: p.tier,
        amount: Number(p.amount),
        timestamp: Number(p.timestamp),
        status: p.status,
        vaultHash: p.vault_hash
      }))
    });
  } catch (err) {
    console.error('Error fetching student pledges:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  login,
  register,
  getMe,
  getMyPledges
};
