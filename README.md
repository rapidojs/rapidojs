<div align="center">
  <h1>🚀 Rapido.js</h1>
  <p><strong>Ultra-lightweight, declarative API framework with top-tier developer experience</strong></p>
  
  <p>
    <a href="https://www.npmjs.com/package/@rapidojs/core"><img src="https://img.shields.io/npm/v/@rapidojs/core.svg" alt="npm version"></a>
    <a href="https://github.com/rapidojs/rapidojs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rapidojs/core.svg" alt="license"></a>
    <a href="https://github.com/rapidojs/rapidojs"><img src="https://img.shields.io/github/stars/rapidojs/rapidojs.svg?style=social" alt="GitHub stars"></a>
  </p>
  
  <p>
    <strong>Modern TypeScript framework for Fastify</strong><br>
    Build high-performance, maintainable RESTful APIs with maximum efficiency and elegance
  </p>
</div>

---

## ✨ Core Features

- 🚀 **Extreme Performance** - Built on Fastify 5.x, delivering ~45,000 RPS exceptional performance
- 🎯 **TypeScript First** - Complete type safety support with top-tier developer experience
- 🎨 **Decorator Driven** - Declarative programming, making business logic the only protagonist in your code
- 🔧 **Smart Pipe System** - Automatic DTO detection and validation, NestJS-like development experience
- 📦 **Enhanced DI Container** - Advanced dependency injection with circular dependency detection, lazy loading, and multiple scopes
- 🔄 **Smart Dependency Management** - Automatic circular dependency detection with warnings and resolution suggestions
- 🎯 **Advanced Decorators** - Conditional injection, lazy loading, and flexible scoping decorators
- ⚡ **ESM Native** - Modern ES module support, embracing future standards
- 🛠️ **Developer Friendly** - Built-in CLI tools for one-click project scaffolding
- 🔐 **Authentication & Authorization** - Built-in JWT authentication with guards and strategy pattern
- 🛡️ **Security** - Guard system for route protection and public route exemptions
- 🔄 **Lifecycle Management** - Complete application lifecycle hooks and event system

## 🚀 Quick Start

### Requirements

- **Node.js** 18.0+ 
- **TypeScript** 5.0+
- **pnpm** (recommended) or npm

### Create Project with CLI (Recommended)

```bash
# Create project quickly with CLI
npx @rapidojs/cli@latest new my-api
cd my-api

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### Manual Installation

```bash
# Install core package
pnpm add @rapidojs/core

# Install validation dependencies
pnpm add class-validator class-transformer reflect-metadata

# Install development dependencies
pnpm add -D typescript @types/node
```

## 📖 Basic Example

### Create Your First API

```typescript
import 'reflect-metadata';
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  Module,
  Injectable,
  RapidoApplication 
} from '@rapidojs/core';
import { IsNotEmpty, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { ParseIntPipe } from '@rapidojs/core';

// DTO definition
export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}

// Service layer
@Injectable()
export class UsersService {
  private users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 25 }
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(user => user.id === id);
  }

  create(userData: CreateUserDto) {
    const newUser = {
      id: this.users.length + 1,
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }
}

// Controller
@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('page', ParseIntPipe) page: number = 1) {
    return {
      data: this.usersService.findAll(),
      page,
      message: 'Users retrieved successfully'
    };
  }

  @Get('/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const user = this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Post()
  create(@Body user: CreateUserDto) {
    // ValidationPipe automatically applied, no manual configuration needed
    return this.usersService.create(user);
  }
}

// Module definition
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

@Module({
  imports: [UsersModule],
})
export class AppModule {}

// Application bootstrap
async function bootstrap() {
  const app = new RapidoApplication(AppModule);
  
  await app.listen(3000);
  console.log('🚀 Application running at: http://localhost:3000');
}

bootstrap();
```

### Test the API

```bash
# Get users list
curl http://localhost:3000/api/users

# Get specific user
curl http://localhost:3000/api/users/1

# Create new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","age":30}'
```

## 🎯 Core Concepts

### Decorator System

#### Basic Decorators
```typescript
// Route decorators
@Controller('/api')    // Controller prefix
@Get('/users')         // GET route
@Post('/users')        // POST route
@Put('/users/:id')     // PUT route
@Delete('/users/:id')  // DELETE route
```

#### Advanced DI Decorators
```typescript
// Dependency scope decorators
@Singleton()           // Single instance (default)
@Transient()          // New instance every time
@RequestScoped()      // One instance per request
@Scope(DependencyScope.SINGLETON) // Explicit scope

// Conditional injection
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
class ProductionService {}

@ConditionalOn({ condition: () => process.platform === 'darwin' })
@Injectable()
class MacOSService {}

// Lazy loading
@Injectable()
class MyService {
  constructor(
    @Lazy() private heavyService: HeavyService
  ) {}
  // heavyService is only instantiated when first accessed
}
@Post('/users')        // POST route
@Put('/users/:id')     // PUT route
@Delete('/users/:id')  // DELETE route

// Parameter decorators
@Param('id', ParseIntPipe)     // Route parameter + pipe
@Query('page')                 // Query parameter
@Body()                        // Request body
@Headers('authorization')      // Request header

// Advanced DI decorators
@Scope(DependencyScope.SINGLETON)  // Dependency scope
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })  // Conditional injection
@Lazy()  // Lazy loading
@Injectable()
export class MyService {}

// Scoped dependencies
@RequestScoped()  // Request-level scope
@Transient()      // New instance every time
@Singleton()      // Single instance (default)
export class ScopedService {}
```

## 🔥 Enhanced Dependency Injection

Rapido.js features a powerful enhanced DI container with advanced capabilities:

### Dependency Scopes

```typescript
import { Injectable, Scope, DependencyScope, RequestScoped, Transient, Singleton } from '@rapidojs/core';

// Singleton scope (default) - one instance per application
@Singleton()
@Injectable()
export class DatabaseService {
  // Shared across the entire application
}

// Transient scope - new instance every time
@Transient()
@Injectable()
export class LoggerService {
  // New instance for each injection
}

// Request scope - one instance per HTTP request
@RequestScoped()
@Injectable()
export class UserContextService {
  // Shared within a single request
}
```

### Conditional Injection

```typescript
import { ConditionalOn, Injectable } from '@rapidojs/core';

// Only register in production environment
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class ProductionCacheService {
  // Only available in production
}

// Register based on configuration
@ConditionalOn({ config: 'feature.redis', value: 'true' })
@Injectable()
export class RedisService {
  // Only when Redis feature is enabled
}

// Custom condition function
@ConditionalOn({ condition: () => process.platform === 'darwin' })
@Injectable()
export class MacOSService {
  // Only on macOS
}
```

### Lazy Loading

```typescript
import { Injectable, Lazy, Inject } from '@rapidojs/core';

@Injectable()
export class MyService {
  constructor(
    @Inject() @Lazy() private heavyService: HeavyComputationService
  ) {
    // HeavyComputationService is only instantiated when first accessed
  }

  async doWork() {
    // Service is instantiated here on first access
    return await this.heavyService.compute();
  }
}
```

### Circular Dependency Detection

```typescript
// The enhanced container automatically detects and warns about circular dependencies
@Injectable()
export class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {}
  // ⚠️ Circular dependency detected: ServiceA -> ServiceB -> ServiceA
  // Use forwardRef() to resolve
}
```

### Enhanced Dependency Injection

#### Basic Injection
```typescript
// Service injection
@Injectable()
export class UsersService {
  findAll() {
    return [];
  }
}

// Constructor injection
@Controller('/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

#### Advanced DI Features
```typescript
// Circular dependency detection and handling
@Injectable()
export class ServiceA {
  constructor(@Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// Multiple dependency scopes
@Singleton()  // Default: one instance for entire app
@Injectable()
export class DatabaseService {}

@Transient()  // New instance every injection
@Injectable()
export class LoggerService {}

@RequestScoped()  // One instance per HTTP request
@Injectable()
export class RequestContextService {}

// Conditional injection based on environment
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class ProductionCacheService {}

@ConditionalOn({ env: 'NODE_ENV', value: 'development' })
@Injectable()
export class DevCacheService {}

// Lazy loading for heavy services
@Injectable()
export class ApiService {
  constructor(
    @Lazy() private analyticsService: AnalyticsService,
    @Lazy() private reportingService: ReportingService
  ) {}
  
  async processData() {
    // Services are only instantiated when first accessed
    await this.analyticsService.track('data_processed');
    return this.reportingService.generate();
  }
}
```

### Smart Pipe System

```typescript
// Automatic DTO validation
@Post('/users')
create(@Body user: CreateUserDto) {
  // ValidationPipe automatically detects DTO type and applies validation
  return user;
}

// Parameter-level pipes
@Get('/users/:id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // Automatically converts string to number
  return { id };
}
```

### Modular Architecture

```typescript
@Module({
  controllers: [UsersController],   // Controllers
  providers: [UsersService],        // Service providers
  imports: [DatabaseModule],        // Import other modules
  exports: [UsersService]           // Export services
})
export class UsersModule {}
```

## 🔧 Advanced Features

### Configuration Management

```typescript
import { ConfigModule, ConfigService } from '@rapidojs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      configFilePath: 'config/app.yaml',
    }),
  ],
})
export class AppModule {}

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}
  
  connect() {
    const host = this.configService.get('DATABASE_HOST', 'localhost');
    const port = this.configService.get('DATABASE_PORT', 5432);
    // Connect to database...
  }
}
```

### Exception Handling

```typescript
import { HttpException, BadRequestException, NotFoundException } from '@rapidojs/core';

@Controller('/api')
export class ApiController {
  @Get('/users/:id')
  findUser(@Param('id', ParseIntPipe) id: number) {
    if (id < 1) {
      throw new BadRequestException('User ID must be greater than 0');
    }
    
    const user = this.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    
    return user;
  }
}
```

### Authentication & Authorization

```typescript
import { AuthModule, JwtAuthGuard } from '@rapidojs/auth';
import { UseGuards, Public, CurrentUser } from '@rapidojs/common';

@Module({
  imports: [
    AuthModule.forRoot({
      secret: 'my-jwt-secret-key',
      sign: { expiresIn: '1d' },
    }),
  ],
})
export class AppModule {}

@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public route - no authentication required
  @Public()
  @Post('/login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  // Protected route - requires valid JWT
  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

### File Upload

```typescript
import { UseMultipart, UploadedFile, UploadedFiles, MultipartFile } from '@rapidojs/common';

@Controller('/api/upload')
export class UploadController {
  // Single file upload
  @Post('/single')
  @UseMultipart()
  uploadSingle(@UploadedFile() file: MultipartFile) {
    console.log('File:', file.filename, file.mimetype, file.buffer.length);
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      size: file.buffer.length,
      mimetype: file.mimetype
    };
  }

  // Multiple files upload
  @Post('/multiple')
  @UseMultipart()
  uploadMultiple(@UploadedFiles() files: MultipartFile[]) {
    console.log('Files count:', files.length);
    return {
      message: 'Files uploaded successfully',
      files: files.map(file => ({
        filename: file.filename,
        size: file.buffer.length,
        mimetype: file.mimetype
      }))
    };
  }

  // Upload with form data
  @Post('/with-data')
  @UseMultipart()
  uploadWithData(
    @UploadedFile() file: MultipartFile,
    @Body() data: any
  ) {
    return {
      file: {
        filename: file.filename,
        size: file.buffer.length
      },
      formData: data
    };
  }
}
```

### Interceptors System

```typescript
import { Interceptor, ExecutionContext, CallHandler, UseInterceptors } from '@rapidojs/core';

// Custom interceptor
@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const start = Date.now();
    console.log(`Before: ${context.getRequest().method} ${context.getRequest().url}`);
    
    const result = await next.handle();
    
    const duration = Date.now() - start;
    console.log(`After: ${duration}ms`);
    
    return result;
  }
}

// Apply interceptor to specific method
@Controller('/api/users')
export class UsersController {
  @Get()
  @UseInterceptors(LoggingInterceptor)
  findAll() {
    return this.usersService.findAll();
  }
}

// Apply interceptor globally
const app = new RapidoApplication(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

### Lifecycle Hooks

```typescript
import { OnModuleInit, OnApplicationBootstrap, OnModuleDestroy } from '@rapidojs/core';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private connection: any;

  async onModuleInit() {
    console.log('DatabaseService: Module initialized');
    // Initialize database connection
    this.connection = await this.createConnection();
  }

  async onApplicationBootstrap() {
    console.log('DatabaseService: Application bootstrapped');
    // Run database migrations or seed data
    await this.runMigrations();
  }

  async onModuleDestroy() {
    console.log('DatabaseService: Module destroyed');
    // Clean up database connection
    await this.connection.close();
  }

  private async createConnection() {
    // Database connection logic
  }

  private async runMigrations() {
    // Migration logic
  }
}
```

### Health Check Module

```typescript
import { HealthModule } from '@rapidojs/core';

@Module({
  imports: [HealthModule],
})
export class AppModule {}

// Available endpoints:
// GET /health - Basic health check
// GET /health/detailed - Detailed system information
// GET /health/readiness - Kubernetes readiness probe
// GET /health/liveness - Kubernetes liveness probe
```

### Redis Cache Module

```typescript
import { RedisModule, RedisService, RedisCacheService, InjectRedis } from '@rapidojs/redis';
import type { Redis } from 'ioredis';

// Single connection configuration
@Module({
  imports: [
    RedisModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
        password: 'your-password',
        db: 0,
      },
    }),
  ],
})
export class AppModule {}

// Multiple connections configuration
@Module({
  imports: [
    RedisModule.forRoot({
      connections: [
        {
          name: 'default',
          host: 'localhost',
          port: 6379,
          isDefault: true,
        },
        {
          name: 'cache',
          host: 'localhost',
          port: 6380,
        },
      ],
    }),
  ],
})
export class AppModule {}

// Using Redis in services
@Injectable()
export class UserService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis('cache') private readonly cacheRedis: Redis,
    private readonly cacheService: RedisCacheService
  ) {}

  async getUser(id: string) {
    // Try cache first
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const user = await this.fetchUserFromDB(id);
    
    // Cache for 1 hour
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    return user;
  }

  async updateUserCache(id: string, user: any) {
    // Update cache
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    // Use raw Redis client for complex operations
    await this.redis.zadd('user:scores', Date.now(), id);
  }

  private async fetchUserFromDB(id: string) {
    // Database logic here
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
}
```

## 📊 Performance Benchmark

| Framework | Requests/sec (RPS) | Latency (ms) | Memory Usage (MB) |
|-----------|-------------------|--------------|-------------------|
| **RapidoJS** | **~45,000** | **~1.2** | **~15** |
| Express | ~25,000 | ~2.1 | ~25 |
| Koa | ~30,000 | ~1.8 | ~20 |
| NestJS | ~20,000 | ~2.5 | ~30 |

*Benchmark environment: Node.js 18, MacBook Pro M1, simple JSON response*

## 🛠️ CLI Tools

```bash
# Install CLI globally
pnpm add -g @rapidojs/cli

# Create new project
rapido new my-api

# Add modules to existing project
rapido add auth          # Add authentication module
rapido add config        # Add configuration module
rapido add schedule      # Add task scheduling module
rapido add testing       # Add testing module

# Generate code files
rapido g controller user # Generate user controller
rapido g service user    # Generate user service
rapido g guard auth      # Generate auth guard
rapido g interceptor log # Generate logging interceptor

# Show help
rapido --help
```

### CLI Features

**Project Generation:**
- ✅ Complete TypeScript configuration
- ✅ SWC fast compiler configuration
- ✅ Example user module
- ✅ Validation pipe integration
- ✅ Development scripts and build configuration

**Module Management:**
- ✅ Automatic package installation
- ✅ Configuration file generation
- ✅ Example code templates
- ✅ Module integration guidance

**Code Generation:**
- ✅ Controllers with CRUD operations
- ✅ Services with business logic templates
- ✅ Guards for authentication/authorization
- ✅ Interceptors for cross-cutting concerns
- ✅ Automatic test file generation

## 📦 Project Structure

```
rapidojs/
├── packages/                    # Core packages
│   ├── core/                   # @rapidojs/core
│   ├── config/                 # @rapidojs/config
│   ├── auth/                   # @rapidojs/auth
│   ├── redis/                  # @rapidojs/redis
│   └── cli/                    # @rapidojs/cli
├── apps/                       # Example applications
│   ├── example-api/           # API example
│   └── docs/                  # Documentation site
├── docs/                      # Project documentation
└── README.md                  # Project readme
```

## 🚧 Development Progress

### ✅ Completed (v1.1.0 "武库")

- [x] **Basic Decorator System** - `@Controller`, `@Get`, `@Post`, etc.
- [x] **Parameter Decorators** - `@Param`, `@Query`, `@Body`, `@Headers`
- [x] **Smart Pipe System** - Automatic DTO detection and validation
- [x] **NestJS-style Pipes** - `@Param('id', ParseIntPipe)`
- [x] **Modular Architecture** - `@Module`, `@Injectable`
- [x] **Exception Handling** - `HttpException`, `BadRequestException`, etc.
- [x] **Configuration Management** - `@rapidojs/config` package
- [x] **CLI Tools** - Project generation and management
- [x] **Authentication & Authorization** - `@rapidojs/auth` package with JWT support
- [x] **Guards System** - `@UseGuards`, `@Public`, `@CurrentUser` decorators
- [x] **Interceptors System** - `@UseInterceptors`, method/class/global interceptors
- [x] **Lifecycle Hooks** - `OnModuleInit`, `OnApplicationBootstrap`, etc.
- [x] **Health Check Module** - Built-in health monitoring endpoints
- [x] **Task Scheduling** - `@rapidojs/schedule` package with declarative task scheduling
- [x] **Redis Cache Module** - `@rapidojs/redis` package with multi-connection support
- [x] **File Upload Support** - `@UseMultipart`, `@UploadedFile`, `@UploadedFiles` decorators with multipart form data handling
- [x] **Test Coverage** - Comprehensive test suite with 477 passing tests

### 🔄 In Progress (v1.1.0 "武库")

- [x] Enhanced CLI features (`add`, `g <schematic>`)
- [ ] Complete documentation site

### 🔄 In Progress (v1.2.0 "数据引擎")

- [x] Cache module with `@rapidojs/redis`
- [x] Database integration with `@rapidojs/typeorm`
- [ ] Official example projects

### 🎯 Future Plans (v1.3.0)

- [ ] WebSocket support
- [ ] GraphQL integration
- [ ] Microservices support
- [ ] Message queue integration
- [ ] Distributed tracing

## 📚 Documentation

- [📖 Complete Documentation](./docs/README.md)
- [🚀 Getting Started](./docs/getting-started.md)
- [🎨 Decorator Guide](./docs/decorators.md)
- [🔧 Pipe System](./docs/pipes.md)
- [📦 Module System](./docs/modules.md)
- [⚙️ Configuration Management](./docs/configuration.md)
- [📁 File Upload](./docs/file-upload.md)
- [🚨 Exception Handling](./docs/exception-filters.md)
- [🧪 Testing Guide](./docs/testing.md)
- [⚡ Performance Optimization](./docs/performance.md)
- [🚀 Deployment Guide](./docs/deployment.md)
- [📋 API Reference](./docs/api-reference.md)

## 🤝 Contributing

We welcome community contributions! Please check [ROADMAP.md](./ROADMAP.md) for development plans.

### How to Contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Environment

```bash
# Clone repository
git clone https://github.com/rapidojs/rapidojs.git
cd rapidojs

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build project
pnpm build
```

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

- [Fastify](https://www.fastify.io/) - High-performance HTTP server
- [NestJS](https://nestjs.com/) - Architectural design inspiration
- [tsyringe](https://github.com/microsoft/tsyringe) - Dependency injection container
- [class-validator](https://github.com/typestack/class-validator) - Validation decorators

---

<div align="center">
  <p><strong>⚡ Start building high-performance API applications!</strong></p>
  <p>
    <a href="./docs/getting-started.md">Get Started</a> ·
    <a href="./docs/README.md">View Docs</a> ·
    <a href="https://github.com/rapidojs/rapidojs/issues">Report Issues</a> ·
    <a href="https://github.com/rapidojs/rapidojs/discussions">Join Discussion</a>
  </p>
</div>