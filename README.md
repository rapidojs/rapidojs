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
- 📦 **Modular Architecture** - Dependency injection based on `tsyringe`, building testable and maintainable applications
- ⚡ **ESM Native** - Modern ES module support, embracing future standards
- 🛠️ **Developer Friendly** - Built-in CLI tools for one-click project scaffolding
- 🔐 **Authentication & Authorization** - Built-in JWT authentication with guards and strategy pattern
- 🛡️ **Security** - Guard system for route protection and public route exemptions

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

```typescript
// Route decorators
@Controller('/api')    // Controller prefix
@Get('/users')         // GET route
@Post('/users')        // POST route
@Put('/users/:id')     // PUT route
@Delete('/users/:id')  // DELETE route

// Parameter decorators
@Param('id', ParseIntPipe)     // Route parameter + pipe
@Query('page')                 // Query parameter
@Body()                        // Request body
@Headers('authorization')      // Request header
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

# Show help
rapido --help
```

Generated project includes:
- ✅ Complete TypeScript configuration
- ✅ SWC fast compiler configuration
- ✅ Example user module
- ✅ Validation pipe integration
- ✅ Development scripts and build configuration

## 📦 Project Structure

```
rapidojs/
├── packages/                    # Core packages
│   ├── core/                   # @rapidojs/core
│   ├── config/                 # @rapidojs/config
│   ├── auth/                   # @rapidojs/auth
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
- [x] **Test Coverage** - Comprehensive test suite with 477 passing tests

### 🔄 In Progress (v1.1.0 "武库")

- [ ] Task scheduling with `@rapidojs/schedule`
- [ ] Enhanced CLI features (`add`, `g <schematic>`)
- [ ] Complete documentation site

### 🎯 Future Plans (v1.2.0 "数据引擎")

- [ ] Database integration with `@rapidojs/typeorm`
- [ ] Cache module with `@rapidojs/redis`
- [ ] Official example projects
- [ ] WebSocket support
- [ ] GraphQL integration
- [ ] Microservices support

## 📚 Documentation

- [📖 Complete Documentation](./docs/README.md)
- [🚀 Getting Started](./docs/getting-started.md)
- [🎨 Decorator Guide](./docs/decorators.md)
- [🔧 Pipe System](./docs/pipes.md)
- [📦 Module System](./docs/modules.md)
- [⚙️ Configuration Management](./docs/configuration.md)
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