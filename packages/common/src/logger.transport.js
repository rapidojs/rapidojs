// packages/common/src/logger.transport.js
import split from 'split2';
import { Transform } from 'stream';

// 日志级别到字符串的映射
const LogLevel = {
  60: 'FATAL',
  50: 'ERROR',
  40: 'WARN',
  30: 'INFO',
  20: 'DEBUG',
  10: 'TRACE',
};

// 导出一个创建 transport 的函数
export default function transport() {
  const transform = new Transform({
    transform(chunk, enc, cb) {
      try {
        const log = JSON.parse(chunk);

        // 格式化时间戳 - 转换为本地时间并格式化为 YYYY-MM-DD HH:mm:ss.SSS
        const time = new Date(log.time).toISOString().replace('T', ' ').slice(0, 23);

        // 级别
        const level = LogLevel[log.level] || 'INFO';

        // 上下文
        const context = log.context || 'Application';

        // 消息
        const msg = log.msg || '';

        // 构建最终的日志行
        const output = `[${time}] ${level.padEnd(5)} (${log.pid}) [${context}]: ${msg}\n`;
        
        this.push(output);
      } catch (err) {
        // 忽略解析错误，但继续处理
      }

      cb();
    },
  });

  // 返回一个处理流水线
  return split().pipe(transform);
} 