const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, '..', 'recordings.db');

// 初始化数据库
function initDatabase(callback) {
  console.log(`📄 连接数据库: ${DB_PATH}`);
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ 数据库连接失败:', err);
      throw err;
    }
    console.log('✅ SQLite数据库连接成功');
  });

  // 创建表结构
  db.serialize(() => {
    // 创建recordings表，包含所有必要字段
    db.run(`CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      recording_id TEXT,
      transcription TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'uploaded',
      tos_object_key TEXT,
      tos_file_url TEXT,
      request_id TEXT,
      tos_upload_status TEXT DEFAULT 'pending',
      speaker_count INTEGER DEFAULT 0,
      speaker_info TEXT,
      session_id TEXT,
      total_chunks INTEGER DEFAULT 1,
      completed_chunks INTEGER DEFAULT 0,
      completed_at DATETIME,
      error_message TEXT
    )`, (err) => {
      if (err) {
        console.error('❌ 创建recordings表失败:', err);
      } else {
        console.log('✅ recordings表已创建');
      }
      
      // 创建索引
      createIndexes();
    });

    // 创建索引的函数
    function createIndexes() {
      console.log('🔧 创建索引...');
      
      // 创建recording_id索引
      db.run("CREATE INDEX IF NOT EXISTS idx_recordings_recording_id ON recordings(recording_id)", (err) => {
        if (err) {
          console.error('❌ 创建recording_id索引失败:', err);
        } else {
          console.log('✅ recording_id索引已创建');
        }
        
        // 创建filename索引
        db.run("CREATE INDEX IF NOT EXISTS idx_recordings_filename ON recordings(filename)", (err) => {
          if (err) {
            console.error('❌ 创建filename索引失败:', err);
          } else {
            console.log('✅ filename索引已创建');
          }
          
          // 创建status索引
          db.run("CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status)", (err) => {
            if (err) {
              console.error('❌ 创建status索引失败:', err);
            } else {
              console.log('✅ status索引已创建');
            }
            
            // 数据库初始化完成
            console.log('✅ 数据库初始化完成');
            if (callback) callback(db);
          });
        });
      });
    }
  });

  return db;
}

// 获取TOS配置（重新导入）
function getTosConfig() {
  console.log('🔧 检查TOS环境变量:');
  console.log('  VOLC_ACCESSKEY:', process.env.VOLC_ACCESSKEY ? '已设置' : '未设置');
  console.log('  VOLC_SECRETKEY:', process.env.VOLC_SECRETKEY ? '已设置' : '未设置');
  
  return {
    region: 'cn-beijing',
    endpoint: 'tos-cn-beijing.byteplus.com',
    accessKeyId: process.env.VOLC_ACCESSKEY,
    accessKeySecret: process.env.VOLC_SECRETKEY,
    bucket: process.env.TOS_BUCKET || 'bucket-bj-0720'
  };
}

module.exports = {
  initDatabase,
  getTosConfig,
  DB_PATH
};
