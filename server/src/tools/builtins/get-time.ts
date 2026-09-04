// server/src/tools/builtins/get-time.ts
import type { Tool, JsonSchema } from '../types.js';

export class GetTimeTool implements Tool {
  readonly name = 'get_time';
  readonly description = '获取当前时间、日期、星期、UNIX时间戳。用户问"几点了"、"今天几号"、"星期几"、"现在时间"时使用此工具。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: '返回格式：readable（中文易读格式，默认）、iso（ISO 8601）、unix（秒级时间戳）',
        enum: ['readable', 'iso', 'unix'],
      },
    },
  };

  async execute(args: any) {
    const format = args?.format || 'readable';
    const now = new Date();

    const iso = now.toISOString();
    const unix = Math.floor(now.getTime() / 1000);

    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const readable = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (format === 'iso') return { datetime: iso };
    if (format === 'unix') return { unix, human: readable };
    return { datetime: iso, readable, unix };
  }
}
