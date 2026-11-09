const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function loadTs(filePath, dependencies = {}, globals = {}) {
  const source = readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', ...Object.keys(globals), compiled)(
    (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module.exports,
    module,
    ...Object.values(globals),
  );
  return module.exports;
}

const srs = loadTs(join(__dirname, '../domain/srs.ts'));
const dailyMissions = loadTs(join(__dirname, '../domain/daily-missions.ts'));
const reviewSession = loadTs(join(__dirname, '../domain/review-session.ts'));
const reviewStatistics = loadTs(join(__dirname, '../domain/review-statistics.ts'), {
  './review-session': reviewSession,
});
const sqliteConnection = loadTs(join(__dirname, '../data/sqlite-connection.ts'));
const basicCourse = loadTs(join(__dirname, '../data/basic-course.ts'));
const cefrCourses = loadTs(join(__dirname, '../data/cefr-courses.ts'));
const advancedCourses = loadTs(join(__dirname, '../data/advanced-courses.ts'));
const collocationCourses = loadTs(join(__dirname, '../data/collocation-courses.ts'));
const courseCatalog = loadTs(join(__dirname, '../data/course-catalog.ts'), {
  './basic-course': basicCourse,
  './cefr-courses': cefrCourses,
  './advanced-courses': advancedCourses,
  './collocation-courses': collocationCourses,
});
const missionChests = loadTs(join(__dirname, '../domain/mission-chests.ts'));
const collectionArtworks = loadTs(join(__dirname, '../domain/collection-artworks.ts'), {
  './mission-chests': missionChests,
});

function createRepository(root, today = '2026-01-01T12:00:00', options = {}) {
  let clock = today;
  let handle;
  class Clock extends Date {
    constructor(value) {
      super(arguments.length ? value : clock);
    }
  }
  const repo = loadTs(
    join(__dirname, '../data/vocabulary.ts'),
    {
      '../domain/srs': srs,
      '../domain/daily-missions': dailyMissions,
      '../domain/review-statistics': reviewStatistics,
      '../domain/mission-chests': missionChests,
      '../domain/collection-artworks': collectionArtworks,
      './sqlite-connection': sqliteConnection,
      './basic-course': basicCourse,
      './course-catalog': courseCatalog,
      'expo-sqlite': {
        openDatabaseAsync: async (filename) => {
          handle = new DatabaseSync(join(root, filename));
          const db = handle;
          return {
            execAsync: async (sql) => {
              db.exec(sql);
              options.afterExec?.(sql);
            },
            getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params),
            getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
            runAsync: async (sql, ...params) => {
              const result = db.prepare(sql).run(...params);
              return {
                changes: result.changes,
                lastInsertRowId: result.lastInsertRowid,
              };
            },
            closeAsync: async () => db.close(),
            withTransactionAsync: async (fn) => {
              db.exec('BEGIN');
              try {
                await fn();
                db.exec('COMMIT');
              } catch (error) {
                db.exec('ROLLBACK');
                throw error;
              }
            },
          };
        },
      },
      'expo-crypto': {
        randomUUID: () => 'test-device-id',
      },
    },
    { Date: Clock },
  );
  return {
    repo,
    get db() {
      return handle;
    },
    setDay: (day) => {
      clock = `${day}T12:00:00`;
    },
  };
}

module.exports = {
  srs,
  reviewStatistics,
  createRepository,
  loadTs,
  basicCourse,
  cefrCourses,
  advancedCourses,
  collocationCourses,
  courseCatalog,
  missionChests,
  collectionArtworks,
};
