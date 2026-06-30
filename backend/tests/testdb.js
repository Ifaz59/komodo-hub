/**
 * tests/testdb.js - Test Database Adapter
 *
 * A drop-in replacement for ../config/db.js used ONLY during automated testing.
 * It exposes the exact same { pool, initDB } interface the route handlers expect,
 * but is backed by Node's built-in `node:sqlite` (DatabaseSync) running an
 * in-memory database. This keeps every test run isolated and repeatable without
 * touching the real database.sqlite file or requiring a native build.
 *
 * The pool.query() translation logic mirrors config/db.js so the PostgreSQL-style
 * SQL used in the routes ($1 params, RETURNING, ILIKE, COALESCE, transactions)
 * behaves identically under test.
 */
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');

function getTableFromInsert(sql) {
  const m = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)/i);
  return m ? m[1] : 'unknown';
}
function getTableFromUpdate(sql) {
  const m = sql.match(/UPDATE\s+(\w+)/i);
  return m ? m[1] : 'unknown';
}
function countPlaceholders(sql) {
  return (sql.match(/\?/g) || []).length;
}

const pool = {
  query: async (text, params = []) => {
    // node-postgres (the original production driver) coerces `undefined` bindings
    // to NULL. The SQLite drivers reject `undefined`, so we replicate pg semantics
    // here. This is what makes the COALESCE-based partial-update routes work.
    params = params.map((x) => (x === undefined ? null : x));
    let sql = text.replace(/\$(\d+)/g, '?');
    sql = sql.replace(/ILIKE/gi, 'LIKE');
    sql = sql.replace(/=\s*CURRENT_TIMESTAMP/gi, "= datetime('now')");
    // SQLite has no GREATEST(); MAX() is the scalar equivalent.
    sql = sql.replace(/GREATEST\s*\(/gi, 'MAX(');

    const trimmed = sql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT');
    const hasReturning = /RETURNING\s+/i.test(sql);

    if (isSelect) {
      return { rows: db.prepare(sql).all(...params) };
    }

    if (hasReturning) {
      const returningMatch = sql.match(/RETURNING\s+(.*?)$/is);
      const returningCols = returningMatch ? returningMatch[1].trim() : '*';
      const execSql = sql.replace(/\s*RETURNING\s+.*$/is, '');
      const result = db.prepare(execSql).run(...params);

      if (trimmed.startsWith('INSERT')) {
        const rows = db.prepare(
          `SELECT ${returningCols} FROM ${getTableFromInsert(execSql)} WHERE rowid = ?`
        ).all(result.lastInsertRowid);
        return { rows };
      } else if (trimmed.startsWith('UPDATE')) {
        const tableName = getTableFromUpdate(execSql);
        const whereMatch = execSql.match(/WHERE\s+(.*?)$/is);
        if (whereMatch) {
          const whereClause = whereMatch[1];
          const whereParams = params.slice(-countPlaceholders(whereClause));
          const rows = db.prepare(
            `SELECT ${returningCols} FROM ${tableName} WHERE ${whereClause}`
          ).all(...whereParams);
          return { rows };
        }
        return { rows: [] };
      } else if (trimmed.startsWith('DELETE')) {
        return { rows: result.changes > 0 ? [{ id: params[params.length - 1] }] : [] };
      }
    }

    try {
      if (sql.includes(';') && (trimmed.startsWith('CREATE') || trimmed.startsWith('--'))) {
        db.exec(sql);
        return { rows: [] };
      }
      const result = db.prepare(sql).run(...params);
      return { rows: [], rowCount: result.changes };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) return { rows: [] };
      throw err;
    }
  },

  connect: async () => ({
    query: async (text, params) => pool.query(text, params),
    release: () => {},
  }),
};

const initDB = async () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'registered_user' CHECK (role IN ('registered_user','donor','volunteer','researcher','admin')),
      avatar TEXT, bio TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS species (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, scientific_name TEXT,
      conservation_status TEXT CHECK (conservation_status IN ('critically_endangered','endangered','vulnerable','near_threatened','least_concern')),
      population_estimate INTEGER, habitat TEXT, description TEXT, threats TEXT, image_url TEXT, location TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      species_id INTEGER REFERENCES species(id) ON DELETE SET NULL,
      location TEXT NOT NULL, latitude REAL, longitude REAL, description TEXT, image_url TEXT,
      sighting_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT, goal_amount REAL NOT NULL, raised_amount REAL DEFAULT 0,
      image_url TEXT, start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      amount REAL NOT NULL, stripe_payment_id TEXT, donor_name TEXT, donor_email TEXT, message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT, location TEXT NOT NULL, event_date TEXT NOT NULL,
      start_time TEXT, end_time TEXT, capacity INTEGER, registered_count INTEGER DEFAULT 0, image_url TEXT,
      status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
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

  const adminHash = await bcrypt.hash('password', 10);
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@komodohub.com');
  if (!existingAdmin) {
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
      .run('Admin', 'admin@komodohub.com', adminHash, 'admin');
  }

  const speciesCount = db.prepare('SELECT COUNT(*) AS c FROM species').get();
  if (speciesCount.c === 0) {
    const ins = db.prepare(`INSERT INTO species (name, scientific_name, conservation_status, population_estimate, habitat, description, threats, image_url, location) VALUES (?,?,?,?,?,?,?,?,?)`);
    ins.run('Komodo Dragon','Varanus komodoensis','endangered',3000,'Savanna','Largest living lizard.','Habitat loss',null,'Komodo Island');
    ins.run('Sumatran Tiger','Panthera tigris sumatrae','critically_endangered',400,'Rainforest','Smallest tiger subspecies.','Poaching',null,'Sumatra');
    ins.run('Bali Myna','Leucopsar rothschildi','critically_endangered',50,'Savanna','White bird endemic to Bali.','Pet trade',null,'Bali');
  }

  const campaignCount = db.prepare('SELECT COUNT(*) AS c FROM campaigns').get();
  if (campaignCount.c === 0) {
    const ins = db.prepare(`INSERT INTO campaigns (title, description, goal_amount, raised_amount, status, created_by) VALUES (?,?,?,?,?,?)`);
    ins.run('Save the Sumatran Tiger','Anti-poaching patrols.',50000,23500,'active',1);
    ins.run('Javan Rhino Protection','Ranger support.',75000,41200,'active',1);
  }

  const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events').get();
  if (eventCount.c === 0) {
    const ins = db.prepare(`INSERT INTO events (title, description, location, event_date, capacity, status, created_by) VALUES (?,?,?,?,?,?,?)`);
    ins.run('Beach Cleanup','Coast cleanup.','Komodo Coast','2026-05-15',50,'upcoming',1);
    ins.run('Tree Planting','Reforestation.','Sumatra','2026-06-20',2,'upcoming',1);   // small capacity for capacity test
    ins.run('Past Census','Completed event.','Java','2026-01-10',30,'completed',1);
  }
};

module.exports = { pool, initDB };
