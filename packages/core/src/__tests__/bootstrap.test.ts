import { describe, it, expect, vi } from 'vitest';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Module, DynamicModule } from '@rapidojs/common';

describe('Bootstrap Mechanism', () => {
  it('should execute bootstrap providers on startup', async () => {
    const bootstrapFn = vi.fn();

    const EagerProvider = {
      provide: 'EAGER_SERVICE',
      useFactory: () => {
        bootstrapFn();
        return { initialized: true };
      },
    };

    @Module({
      providers: [EagerProvider],
      bootstrap: ['EAGER_SERVICE'],
    } as any)
    class TestModule {}

    await RapidoFactory.create(TestModule);

    expect(bootstrapFn).toHaveBeenCalled();
    expect(bootstrapFn).toHaveBeenCalledTimes(1);
  });

  it('should execute bootstrap providers from a dynamic module', async () => {
    const dynamicBootstrapFn = vi.fn();

    const DynamicEagerProvider = {
      provide: 'DYNAMIC_EAGER_SERVICE',
      useFactory: () => {
        dynamicBootstrapFn();
        return { initialized: true };
      },
    };

    class TestDynamicModule {
      static forRoot(): DynamicModule {
        return {
          module: TestDynamicModule,
          providers: [DynamicEagerProvider],
          bootstrap: ['DYNAMIC_EAGER_SERVICE'],
        } as any;
      }
    }

    @Module({
      imports: [TestDynamicModule.forRoot()],
    })
    class RootModule {}

    await RapidoFactory.create(RootModule);

    expect(dynamicBootstrapFn).toHaveBeenCalled();
  });

  it('should execute bootstrap providers with dependencies', async () => {
    const bootstrapFnWithDep = vi.fn();

    const DependencyService = {
      provide: 'DEP_SERVICE',
      useValue: 'dependency-value',
    };

    const EagerProviderWithDep = {
      provide: 'EAGER_WITH_DEP',
      useFactory: (dep: string) => {
        bootstrapFnWithDep(dep);
        return { initializedWith: dep };
      },
      inject: ['DEP_SERVICE'],
    };

    @Module({
      providers: [DependencyService, EagerProviderWithDep],
      bootstrap: ['EAGER_WITH_DEP'],
    } as any)
    class TestModuleWithDep {}

    await RapidoFactory.create(TestModuleWithDep);

    expect(bootstrapFnWithDep).toHaveBeenCalledWith('dependency-value');
  });
}); 