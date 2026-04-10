/**
 * config/db.js - Database Configuration and Initialisation (SQLite version)
 *
 * This module uses better-sqlite3 for a zero-configuration local database.
 * It exports a `pool` object that mimics the pg (PostgreSQL) pool.query interface
 * so that all route files work without modification.
 *
 * The database file is stored as `database.sqlite` in the backend directory.
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create/open the SQLite database file
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
// Enable foreign keys (disabled by default in SQLite)
db.pragma('foreign_keys = ON');

/**
 * pool - PostgreSQL-compatible query wrapper for SQLite
 *
 * Provides pool.query(sql, params) that works like pg's pool.query,
 * returning { rows: [...] } so all route handlers work unchanged.
 *
 * Handles both SELECT (returns rows) and INSERT/UPDATE/DELETE (returns affected rows).
 * Converts PostgreSQL $1,$2 parameter placeholders to SQLite ? placeholders.
 * Supports RETURNING clause by using a follow-up SELECT after INSERT/UPDATE/DELETE.
 */
const pool = {
  query: async (text, params = []) => {
    // Convert PostgreSQL $1, $2 style params to SQLite ? style
    let sql = text.replace(/\$(\d+)/g, '?');

    // Remove PostgreSQL-specific syntax that SQLite doesn't support
    sql = sql.replace(/ON CONFLICT \(email\) DO NOTHING/gi, 'ON CONFLICT(email) DO NOTHING');
    sql = sql.replace(/ON CONFLICT DO NOTHING/gi, 'OR IGNORE');
    sql = sql.replace(/INSERT INTO/gi, (match) => {
      // Check if this INSERT already has ON CONFLICT / OR IGNORE
      return match;
    });

    // Handle ILIKE (case-insensitive LIKE) - SQLite LIKE is case-insensitive for ASCII
    sql = sql.replace(/ILIKE/gi, 'LIKE');

    // Handle SERIAL PRIMARY KEY -> INTEGER PRIMARY KEY AUTOINCREMENT
    sql = sql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

    // Handle VARCHAR(n), DECIMAL(n,m) -> TEXT, REAL
    sql = sql.replace(/VARCHAR\(\d+\)/gi, 'TEXT');
    sql = sql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'REAL');

    // Handle TIMESTAMP -> TEXT (SQLite stores as text)
    sql = sql.replace(/TIMESTAMP/gi, 'TEXT');

    // Handle DEFAULT CURRENT_TIMESTAMP -> DEFAULT (datetime('now'))
    sql = sql.replace(/DEFAULT CURRENT_TIMESTAMP/gi, "DEFAULT (datetime('now'))");

    // Handle CURRENT_TIMESTAMP in UPDATE SET clauses (e.g., updated_at = CURRENT_TIMESTAMP)
    sql = sql.replace(/=\s*CURRENT_TIMESTAMP/gi, "= datetime('now')");

    // Handle TIME -> TEXT
    sql = sql.replace(/\bTIME\b(?!\s*\()/gi, 'TEXT');
    // But don't replace TIMESTAMP which is already handled

    // Handle DATE type -> TEXT
    sql = sql.replace(/\bDATE\b(?!\s*\()/gi, 'TEXT');

    // Handle CHECK constraints - keep them as-is, SQLite supports CHECK
    // Handle REFERENCES - keep them, we enabled foreign_keys

    // Determine if this is a read or write query
    const trimmed = sql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT');
    const hasReturning = /RETURNING\s+/i.test(sql);

    if (isSelect) {
      const rows = db.prepare(sql).all(...params);
      return { rows };
    }

    if (hasReturning) {
      // Extract the RETURNING clause columns
      const returningMatch = sql.match(/RETURNING\s+(.*?)$/is);
      const returningCols = returningMatch ? returningMatch[1].trim() : '*';

      // Remove the RETURNING clause for the actual execution
      const execSql = sql.replace(/\s*RETURNING\s+.*$/is, '');

      const result = db.prepare(execSql).run(...params);

      // Fetch the affected row(s)
      if (trimmed.startsWith('INSERT')) {
        const rows = db.prepare(`SELECT ${returningCols} FROM ${getTableFromInsert(execSql)} WHERE rowid = ?`).all(result.lastInsertRowid);
        return { rows };
      } else if (trimmed.startsWith('UPDATE')) {
        // For UPDATE, re-run a SELECT with the same WHERE clause
        const tableName = getTableFromUpdate(execSql);
        const whereMatch = execSql.match(/WHERE\s+(.*?)$/is);
        if (whereMatch) {
          // Get the last param which is typically the id in WHERE id = ?
          const whereClause = whereMatch[1];
          const whereParams = params.slice(-countPlaceholders(whereClause));
          const rows = db.prepare(`SELECT ${returningCols} FROM ${tableName} WHERE ${whereClause}`).all(...whereParams);
          return { rows };
        }
        return { rows: [] };
      } else if (trimmed.startsWith('DELETE')) {
        // For DELETE with RETURNING, we need to select BEFORE deleting
        // Since we already deleted, return the id
        return { rows: result.changes > 0 ? [{ id: params[params.length - 1] }] : [] };
      }
    }

    // Non-RETURNING write operations (CREATE TABLE, plain INSERT, etc.)
    try {
      // Handle multi-statement SQL (like our init script)
      if (sql.includes(';') && (trimmed.startsWith('CREATE') || trimmed.startsWith('--'))) {
        db.exec(sql);
        return { rows: [] };
      }
      const result = db.prepare(sql).run(...params);
      return { rows: [], rowCount: result.changes };
    } catch (err) {
      // Handle OR IGNORE silently (equivalent to ON CONFLICT DO NOTHING)
      if (err.message.includes('UNIQUE constraint failed') || err.message.includes('OR IGNORE')) {
        return { rows: [] };
      }
      throw err;
    }
  },

  // For transaction support (used by donations and events routes)
  connect: async () => {
    return {
      query: async (text, params) => pool.query(text, params),
      release: () => { /* no-op for SQLite */ },
    };
  },
};

/** Helper: Extract table name from INSERT INTO tablename ... */
function getTableFromInsert(sql) {
  const match = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)/i);
  return match ? match[1] : 'unknown';
}

/** Helper: Extract table name from UPDATE tablename SET ... */
function getTableFromUpdate(sql) {
  const match = sql.match(/UPDATE\s+(\w+)/i);
  return match ? match[1] : 'unknown';
}

/** Helper: Count ? placeholders in a SQL fragment */
function countPlaceholders(sql) {
  return (sql.match(/\?/g) || []).length;
}

/**
 * initDB - Creates all database tables and seeds initial data
 *
 * Uses SQLite-compatible CREATE TABLE IF NOT EXISTS statements.
 * Seeds an admin user, sample species, campaigns, and events.
 */
const initDB = async () => {
  try {
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'registered_user' CHECK (role IN ('registered_user', 'donor', 'volunteer', 'researcher', 'admin')),
        avatar TEXT,
        bio TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        scientific_name TEXT,
        conservation_status TEXT CHECK (conservation_status IN ('critically_endangered', 'endangered', 'vulnerable', 'near_threatened', 'least_concern')),
        population_estimate INTEGER,
        habitat TEXT,
        description TEXT,
        threats TEXT,
        image_url TEXT,
        location TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sightings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        species_id INTEGER REFERENCES species(id) ON DELETE SET NULL,
        location TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        description TEXT,
        image_url TEXT,
        sighting_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        goal_amount REAL NOT NULL,
        raised_amount REAL DEFAULT 0,
        image_url TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        stripe_payment_id TEXT,
        donor_name TEXT,
        donor_email TEXT,
        message TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        event_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        capacity INTEGER,
        registered_count INTEGER DEFAULT 0,
        image_url TEXT,
        status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        registered_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, event_id)
      );
    `);

    // Seed admin user (password: "password" hashed with bcrypt)
    const adminHash = await bcrypt.hash('password', 10);
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@komodohub.com');
    if (!existingAdmin) {
      db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin', 'admin@komodohub.com', adminHash, 'admin');
    }

    // Seed sample species
    const speciesCount = db.prepare('SELECT COUNT(*) as count FROM species').get();
    if (speciesCount.count === 0) {
      const insertSpecies = db.prepare(`INSERT INTO species (name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      const speciesData = [
        ['Sumatran Tiger', 'Panthera tigris sumatrae', 'critically_endangered', 400, 'Tropical rainforests of Sumatra', 'The Sumatran tiger is the smallest surviving tiger subspecies. Distinguished by heavy black stripes on their orange coat.', 'Habitat loss, poaching, human-wildlife conflict', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Sumatran_Tiger_Berlin_Tierpark.jpg/800px-Sumatran_Tiger_Berlin_Tierpark.jpg', 'Sumatra, Indonesia'],
        ['Javan Rhinoceros', 'Rhinoceros sondaicus', 'critically_endangered', 72, 'Tropical lowland rainforests', 'The Javan rhino is the rarest of the world\'s five rhino species. They have a single horn and grey skin with loose folds.', 'Habitat loss, poaching for horn, natural disasters', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Rhinoceros_sondaicus_in_London_Zoo.jpg/800px-Rhinoceros_sondaicus_in_London_Zoo.jpg', 'Ujung Kulon, Java, Indonesia'],
        ['Bali Myna', 'Leucopsar rothschildi', 'critically_endangered', 50, 'Dry monsoon forests and savanna', 'The Bali myna is a striking white bird with blue skin around the eyes and black wing tips. It is endemic to Bali.', 'Illegal pet trade, habitat loss', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Bali_Myna_0001.jpg/800px-Bali_Myna_0001.jpg', 'Bali, Indonesia'],
        ['Javan Eagle', 'Nisaetus bartelsi', 'endangered', 300, 'Mountain rainforests', 'The Javan hawk-eagle is the national bird of Indonesia. It has a prominent crest and brown plumage with barred underparts.', 'Deforestation, illegal capture', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Nisaetus_bartelsi.jpg/800px-Nisaetus_bartelsi.jpg', 'Java, Indonesia'],
        ['Tarsius', 'Tarsius tarsier', 'vulnerable', 1000, 'Tropical forests and scrubland', 'Tarsiers are small primates with enormous eyes. They are nocturnal and feed primarily on insects.', 'Habitat destruction, pet trade', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Tarsier_Bohol.jpg/800px-Tarsier_Bohol.jpg', 'Sulawesi, Indonesia'],
        ['Celebes Crested Macaque', 'Macaca nigra', 'critically_endangered', 5000, 'Tropical rainforests', 'The Celebes crested macaque is an Old World monkey with distinctive jet-black hair and a tall crest on the head.', 'Hunting, habitat loss, human conflict', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Macaca_nigra_self-portrait.jpg/800px-Macaca_nigra_self-portrait.jpg', 'Sulawesi, Indonesia'],
        ['Komodo Dragon', 'Varanus komodoensis', 'endangered', 3000, 'Tropical savanna and forest', 'The Komodo dragon is the largest living lizard species, growing up to 3 meters long. They are apex predators.', 'Habitat loss, climate change, volcanic activity', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Komodo_dragon_%28Varanus_komodoensis%29.jpg/800px-Komodo_dragon_%28Varanus_komodoensis%29.jpg', 'Komodo Island, Indonesia'],
      ];

      const insertMany = db.transaction((data) => {
        for (const row of data) insertSpecies.run(...row);
      });
      insertMany(speciesData);
    }

    // Seed sample campaigns
    const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
    if (campaignCount.count === 0) {
      const insertCampaign = db.prepare(`INSERT INTO campaigns (title, description, goal_amount, raised_amount, image_url, start_date, end_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      insertCampaign.run('Save the Sumatran Tiger', 'Help protect the last remaining Sumatran tigers through anti-poaching patrols and habitat restoration.', 50000, 23500, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Sumatran_Tiger_Berlin_Tierpark.jpg/800px-Sumatran_Tiger_Berlin_Tierpark.jpg', '2026-01-01', '2026-12-31', 'active', 1);
      insertCampaign.run('Javan Rhino Protection Fund', 'Support the Ujung Kulon National Park rangers in protecting the critically endangered Javan Rhinoceros.', 75000, 41200, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Rhinoceros_sondaicus_in_London_Zoo.jpg/800px-Rhinoceros_sondaicus_in_London_Zoo.jpg', '2026-02-01', '2026-11-30', 'active', 1);
      insertCampaign.run('Bali Myna Breeding Program', 'Fund the captive breeding and release program for the critically endangered Bali Myna bird.', 30000, 12800, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Bali_Myna_0001.jpg/800px-Bali_Myna_0001.jpg', '2026-03-01', '2026-09-30', 'active', 1);
    }

    // Seed sample events
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get();
    if (eventCount.count === 0) {
      const insertEvent = db.prepare(`INSERT INTO events (title, description, location, event_date, start_time, end_time, capacity, image_url, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      insertEvent.run('Beach Cleanup - Komodo Coast', 'Join us for a beach cleanup along the Komodo coastline to protect marine habitats.', 'Komodo Island, NTT', '2026-05-15', '08:00', '14:00', 50, null, 'upcoming', 1);
      insertEvent.run('Rainforest Tree Planting', 'Help restore degraded rainforest areas in Sumatra by planting native tree species.', 'Bukit Barisan, Sumatra', '2026-06-20', '07:00', '16:00', 100, null, 'upcoming', 1);
      insertEvent.run('Wildlife Census Volunteer Day', 'Assist researchers in conducting a wildlife census in Ujung Kulon National Park.', 'Ujung Kulon, Java', '2026-07-10', '06:00', '18:00', 30, null, 'upcoming', 1);
      insertEvent.run('Conservation Education Workshop', 'A workshop for teachers and students on integrating conservation into school curricula.', 'Jakarta Convention Center', '2026-08-05', '09:00', '17:00', 200, null, 'upcoming', 1);
    }

    console.log('Database tables created and seeded successfully');
  } catch (err) {
    console.error('Database init error:', err);
    throw err;
  }
};

module.exports = { pool, initDB };
