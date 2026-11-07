const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function loadTs(filePath, dependencies = {}, globals = {}) {
  const source = readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', ...Object.keys(globals), compiled)(
    name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module.exports, module, ...Object.values(globals),
  );
  return module.exports;
}

const srs = loadTs(join(__dirname, '../domain/srs.ts'));
const sqliteConnection = loadTs(join(__dirname, '../data/sqlite-connection.ts'));

function createRepository(root, today = '2026-01-01T12:00:00') {
  let clock = today;
  let handle;
  class Clock extends Date {
    constructor(value) { super(arguments.length ? value : clock); }
  }
  const repo = loadTs(join(__dirname, '../data/vocabulary.ts'), {
    '../domain/srs': srs,
    './sqlite-connection': sqliteConnection,
    'expo-sqlite': {
      openDatabaseAsync: async filename => {
        handle = new DatabaseSync(join(root, filename));
        const db = handle;
        return {
          execAsync: async sql => db.exec(sql),
          getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params),
          getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
          runAsync: async (sql, ...params) => {
            const result = db.prepare(sql).run(...params);
            return { changes: result.changes, lastInsertRowId: result.lastInsertRowid };
          },
          closeAsync: async () => db.close(),
          withTransactionAsync: async fn => {
            db.exec('BEGIN');
            try { await fn(); db.exec('COMMIT'); }
            catch (error) { db.exec('ROLLBACK'); throw error; }
          },
        };
      },
    },
  }, { Date: Clock });
  return { repo, get db() { return handle; }, setDay: day => { clock = `${day}T12:00:00`; } };
}

module.exports = { srs, createRepository, loadTs };
