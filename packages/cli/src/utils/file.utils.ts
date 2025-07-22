import fs from 'fs-extra';
import { join, dirname } from 'path';

const { writeFile, ensureDir } = fs;

export class FileUtils {
  static async writeFileEnsureDir(filePath: string, content: string): Promise<void> {
    await ensureDir(dirname(filePath));
    await writeFile(filePath, content);
  }

  static toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  static toPlural(str: string): string {
    // 简单的复数化规则
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    }
    if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
      return str + 'es';
    }
    return str + 's';
  }
} 