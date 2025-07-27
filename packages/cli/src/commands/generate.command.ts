import { Command } from 'commander';
import { writeFileEnsureDir, toPascalCase, toCamelCase } from '../utils/file.utils.js';
import path from 'path';
import fs from 'fs';

/**
 * 生成命令类
 * 支持生成控制器、服务、守卫、拦截器等代码文件
 */
export class GenerateCommand {
  /**
   * 注册生成命令
   */
  static register(program: Command): void {
    const generateCmd = program
      .command('generate')
      .alias('g')
      .description('生成代码文件')
      .argument('<type>', '生成类型 (controller|service|guard|interceptor)')
      .argument('<name>', '文件名称')
      .option('-d, --dir <directory>', '目标目录', 'src')
      .option('--no-spec', '不生成测试文件')
      .action(async (type: string, name: string, options: any) => {
        const generator = new GenerateCommand();
        await generator.generate(type, name, options);
      });

    // 添加子命令
    generateCmd
      .command('controller <name>')
      .alias('c')
      .description('生成控制器')
      .option('-d, --dir <directory>', '目标目录', 'src')
      .option('--no-spec', '不生成测试文件')
      .action(async (name: string, options: any) => {
        const generator = new GenerateCommand();
        await generator.generate('controller', name, options);
      });

    generateCmd
      .command('service <name>')
      .alias('s')
      .description('生成服务')
      .option('-d, --dir <directory>', '目标目录', 'src')
      .option('--no-spec', '不生成测试文件')
      .action(async (name: string, options: any) => {
        const generator = new GenerateCommand();
        await generator.generate('service', name, options);
      });

    generateCmd
      .command('guard <name>')
      .alias('gu')
      .description('生成守卫')
      .option('-d, --dir <directory>', '目标目录', 'src')
      .option('--no-spec', '不生成测试文件')
      .action(async (name: string, options: any) => {
        const generator = new GenerateCommand();
        await generator.generate('guard', name, options);
      });

    generateCmd
      .command('interceptor <name>')
      .alias('i')
      .description('生成拦截器')
      .option('-d, --dir <directory>', '目标目录', 'src')
      .option('--no-spec', '不生成测试文件')
      .action(async (name: string, options: any) => {
        const generator = new GenerateCommand();
        await generator.generate('interceptor', name, options);
      });
  }

  /**
   * 生成代码文件
   */
  async generate(type: string, name: string, options: any): Promise<void> {
    try {
      console.log(`正在生成 ${type}: ${name}...`);

      switch (type.toLowerCase()) {
        case 'controller':
        case 'c':
          await this.generateController(name, options);
          break;
        case 'service':
        case 's':
          await this.generateService(name, options);
          break;
        case 'guard':
        case 'gu':
          await this.generateGuard(name, options);
          break;
        case 'interceptor':
        case 'i':
          await this.generateInterceptor(name, options);
          break;
        default:
          console.error(`不支持的生成类型: ${type}`);
          console.log('支持的类型: controller, service, guard, interceptor');
          process.exit(1);
      }

      console.log(`✅ ${type} '${name}' 生成成功!`);
    } catch (error) {
      console.error(`❌ 生成失败:`, error);
      process.exit(1);
    }
  }

  /**
   * 生成控制器
   */
  private async generateController(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Controller';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'controllers');
    const filePath = path.join(targetDir, `${fileName}.controller.ts`);

    const content = `import { Controller, Get, Post, Put, Delete, Param, Body } from '@rapidojs/common';

/**
 * ${className}
 * ${name} 控制器
 */
@Controller('/${fileName}')
export class ${className} {
  /**
   * 获取所有 ${name}
   */
  @Get()
  async findAll() {
    return {
      message: '获取所有 ${name}',
      data: []
    };
  }

  /**
   * 根据ID获取 ${name}
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      message: \`获取 ${name} \${id}\`,
      data: { id }
    };
  }

  /**
   * 创建 ${name}
   */
  @Post()
  async create(@Body() createDto: any) {
    return {
      message: '创建 ${name} 成功',
      data: createDto
    };
  }

  /**
   * 更新 ${name}
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return {
      message: \`更新 ${name} \${id} 成功\`,
      data: { id, ...updateDto }
    };
  }

  /**
   * 删除 ${name}
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return {
      message: \`删除 ${name} \${id} 成功\`
    };
  }
}
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建文件: ${filePath}`);

    // 生成测试文件
    if (options.spec !== false) {
      await this.generateControllerSpec(name, options);
    }
  }

  /**
   * 生成控制器测试文件
   */
  private async generateControllerSpec(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Controller';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'controllers');
    const filePath = path.join(targetDir, `${fileName}.controller.spec.ts`);

    const content = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${className} } from './${fileName}.controller.js';

describe('${className}', () => {
  let controller: ${className};

  beforeEach(() => {
    controller = new ${className}();
  });

  describe('findAll', () => {
    it('应该返回所有 ${name}', async () => {
      const result = await controller.findAll();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('应该根据ID返回 ${name}', async () => {
      const id = '1';
      const result = await controller.findOne(id);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(result.data.id).toBe(id);
    });
  });

  describe('create', () => {
    it('应该创建新的 ${name}', async () => {
      const createDto = { name: 'test' };
      const result = await controller.create(createDto);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(createDto);
    });
  });

  describe('update', () => {
    it('应该更新 ${name}', async () => {
      const id = '1';
      const updateDto = { name: 'updated' };
      const result = await controller.update(id, updateDto);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(result.data.id).toBe(id);
    });
  });

  describe('remove', () => {
    it('应该删除 ${name}', async () => {
      const id = '1';
      const result = await controller.remove(id);
      expect(result).toHaveProperty('message');
    });
  });
});
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建测试文件: ${filePath}`);
  }

  /**
   * 生成服务
   */
  private async generateService(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Service';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'services');
    const filePath = path.join(targetDir, `${fileName}.service.ts`);

    const content = `import { Injectable } from '@rapidojs/common';

/**
 * ${className}
 * ${name} 服务类
 */
@Injectable()
export class ${className} {
  /**
   * 查找所有 ${name}
   */
  async findAll() {
    // TODO: 实现查找所有 ${name} 的逻辑
    return [];
  }

  /**
   * 根据ID查找 ${name}
   */
  async findOne(id: string) {
    // TODO: 实现根据ID查找 ${name} 的逻辑
    return { id };
  }

  /**
   * 创建 ${name}
   */
  async create(createDto: any) {
    // TODO: 实现创建 ${name} 的逻辑
    return { id: Date.now().toString(), ...createDto };
  }

  /**
   * 更新 ${name}
   */
  async update(id: string, updateDto: any) {
    // TODO: 实现更新 ${name} 的逻辑
    return { id, ...updateDto };
  }

  /**
   * 删除 ${name}
   */
  async remove(id: string) {
    // TODO: 实现删除 ${name} 的逻辑
    return { id };
  }
}
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建文件: ${filePath}`);

    // 生成测试文件
    if (options.spec !== false) {
      await this.generateServiceSpec(name, options);
    }
  }

  /**
   * 生成服务测试文件
   */
  private async generateServiceSpec(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Service';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'services');
    const filePath = path.join(targetDir, `${fileName}.service.spec.ts`);

    const content = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${className} } from './${fileName}.service.js';

describe('${className}', () => {
  let service: ${className};

  beforeEach(() => {
    service = new ${className}();
  });

  describe('findAll', () => {
    it('应该返回所有 ${name}', async () => {
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('应该根据ID返回 ${name}', async () => {
      const id = '1';
      const result = await service.findOne(id);
      expect(result).toHaveProperty('id', id);
    });
  });

  describe('create', () => {
    it('应该创建新的 ${name}', async () => {
      const createDto = { name: 'test' };
      const result = await service.create(createDto);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('update', () => {
    it('应该更新 ${name}', async () => {
      const id = '1';
      const updateDto = { name: 'updated' };
      const result = await service.update(id, updateDto);
      expect(result.id).toBe(id);
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('应该删除 ${name}', async () => {
      const id = '1';
      const result = await service.remove(id);
      expect(result).toHaveProperty('id', id);
    });
  });
});
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建测试文件: ${filePath}`);
  }

  /**
   * 生成守卫
   */
  private async generateGuard(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Guard';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'guards');
    const filePath = path.join(targetDir, `${fileName}.guard.ts`);

    const content = `import { Injectable, CanActivate, ExecutionContext } from '@rapidojs/common';

/**
 * ${className}
 * ${name} 守卫
 */
@Injectable()
export class ${className} implements CanActivate {
  /**
   * 判断是否可以激活路由
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // TODO: 实现守卫逻辑
    // 例如：检查用户权限、验证token等
    
    console.log('${className} 守卫检查:', request.url);
    
    // 默认允许访问，请根据实际需求修改
    return true;
  }
}
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建文件: ${filePath}`);

    // 生成测试文件
    if (options.spec !== false) {
      await this.generateGuardSpec(name, options);
    }
  }

  /**
   * 生成守卫测试文件
   */
  private async generateGuardSpec(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Guard';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'guards');
    const filePath = path.join(targetDir, `${fileName}.guard.spec.ts`);

    const content = `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${className} } from './${fileName}.guard.js';
import { ExecutionContext } from '@rapidojs/common';

describe('${className}', () => {
  let guard: ${className};
  let mockContext: ExecutionContext;

  beforeEach(() => {
    guard = new ${className}();
    
    // Mock ExecutionContext
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/test',
          headers: {},
          user: null
        }),
        getResponse: () => ({})
      })
    } as ExecutionContext;
  });

  describe('canActivate', () => {
    it('应该允许访问', async () => {
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    // TODO: 添加更多测试用例
    // it('应该拒绝未授权的访问', async () => {
    //   // 修改 mockContext 以模拟未授权情况
    //   const result = await guard.canActivate(mockContext);
    //   expect(result).toBe(false);
    // });
  });
});
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建测试文件: ${filePath}`);
  }

  /**
   * 生成拦截器
   */
  private async generateInterceptor(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Interceptor';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'interceptors');
    const filePath = path.join(targetDir, `${fileName}.interceptor.ts`);

    const content = `import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@rapidojs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

/**
 * ${className}
 * ${name} 拦截器
 */
@Injectable()
export class ${className} implements NestInterceptor {
  /**
   * 拦截请求和响应
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    
    console.log('${className} 拦截器 - 请求开始:', request.url);
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        console.log(\`${className} 拦截器 - 请求完成: \${request.url} (耗时: \${duration}ms)\`);
      }),
      map((data) => {
        // TODO: 在这里可以修改响应数据
        // 例如：添加时间戳、格式化数据等
        
        return {
          ...data,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };
      })
    );
  }
}
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建文件: ${filePath}`);

    // 生成测试文件
    if (options.spec !== false) {
      await this.generateInterceptorSpec(name, options);
    }
  }

  /**
   * 生成拦截器测试文件
   */
  private async generateInterceptorSpec(name: string, options: any): Promise<void> {
    const className = toPascalCase(name) + 'Interceptor';
    const fileName = name.toLowerCase();
    const targetDir = path.join(process.cwd(), options.dir, 'interceptors');
    const filePath = path.join(targetDir, `${fileName}.interceptor.spec.ts`);

    const content = `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${className} } from './${fileName}.interceptor.js';
import { ExecutionContext, CallHandler } from '@rapidojs/common';
import { of } from 'rxjs';

describe('${className}', () => {
  let interceptor: ${className};
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new ${className}();
    
    // Mock ExecutionContext
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/test',
          method: 'GET'
        }),
        getResponse: () => ({})
      })
    } as ExecutionContext;
    
    // Mock CallHandler
    mockCallHandler = {
      handle: () => of({ message: 'test response' })
    };
  });

  describe('intercept', () => {
    it('应该拦截请求并添加时间戳', (done) => {
      const result = interceptor.intercept(mockContext, mockCallHandler);
      
      result.subscribe((data) => {
        expect(data).toHaveProperty('message', 'test response');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('duration');
        expect(typeof data.timestamp).toBe('string');
        expect(typeof data.duration).toBe('number');
        done();
      });
    });
  });
});
`;

    await writeFileEnsureDir(filePath, content);
    console.log(`📁 创建测试文件: ${filePath}`);
  }
}