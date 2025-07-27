import fs from 'fs-extra';
import { join, dirname } from 'path';

const { writeFile, ensureDir } = fs;

/**
 * 确保目录存在并写入文件
 */
export async function writeFileEnsureDir(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content);
}

/**
 * 转换为帕斯卡命名（首字母大写）
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * 转换为驼峰命名（首字母小写）
 */
export function toCamelCase(str: string): string {
  const pascalCase = toPascalCase(str);
  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

/**
 * 转换为复数形式
 */
export function toPlural(str: string): string {
  // 简单的复数化规则
  if (str.endsWith('y')) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
    return str + 'es';
  }
  if (str === 'child') {
    return 'children';
  }
  if (str === 'person') {
    return 'people';
  }
  if (str.endsWith('category')) {
    return str.slice(0, -1) + 'ies';
  }
  return str + 's';
}

export class FileUtils {
  static async writeFileEnsureDir(filePath: string, content: string): Promise<void> {
    return writeFileEnsureDir(filePath, content);
  }

  static toPascalCase(str: string): string {
    return toPascalCase(str);
  }

  static toCamelCase(str: string): string {
    return toCamelCase(str);
  }

  static toPlural(str: string): string {
    return toPlural(str);
  }
}