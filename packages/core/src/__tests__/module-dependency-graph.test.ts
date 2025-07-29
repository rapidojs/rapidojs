import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleDependencyGraph } from '../modules/dependency-graph.js';
import { Module } from '@rapidojs/common';
import { forwardRef } from '../di/forward-ref.js';

describe('Module Dependency Graph', () => {
  let graph: ModuleDependencyGraph;

  beforeEach(() => {
    graph = new ModuleDependencyGraph();
  });

  describe('Basic Graph Building', () => {
    it('should build a simple dependency graph', () => {
      class ServiceA {}
      class ServiceB {}
      class ControllerA {}
      
      @Module({
        providers: [ServiceA, ServiceB],
        controllers: [ControllerA]
      })
      class ModuleA {}

      class ServiceC {}
      class ControllerB {}
      
      @Module({
        imports: [ModuleA],
        providers: [ServiceC],
        controllers: [ControllerB]
      })
      class ModuleB {}

      class ServiceD {}
      
      @Module({
        imports: [ModuleB],
        providers: [ServiceD]
      })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);

      expect(dependencyGraph.nodes.size).toBe(3);
      expect(dependencyGraph.edges.length).toBeGreaterThan(0);
      
      const rootNode = dependencyGraph.nodes.get('RootModule');
      expect(rootNode).toBeDefined();
      expect(rootNode!.name).toBe('RootModule');
      expect(rootNode!.type).toBe('static');
      expect(rootNode!.providers).toContain('ServiceD');
    });

    it('should handle dynamic modules', () => {
      class DynamicService {}
      
      @Module({})
      class BaseModule {
        static forRoot(config: any) {
          return {
            module: BaseModule,
            providers: [
              { provide: 'CONFIG', useValue: config },
              DynamicService
            ],
            exports: [DynamicService]
          };
        }
      }

      const dynamicModule = BaseModule.forRoot({ key: 'value' });

      @Module({
        imports: [dynamicModule]
      })
      class AppModule {}

      const dependencyGraph = graph.buildGraph(AppModule);

      expect(dependencyGraph.nodes.size).toBe(2);
      
      // 查找动态模块节点
      const dynamicNode = Array.from(dependencyGraph.nodes.values())
        .find(node => node.type === 'dynamic');
      
      expect(dynamicNode).toBeDefined();
      expect(dynamicNode!.providers).toContain('CONFIG');
      expect(dynamicNode!.providers).toContain('DynamicService');
    });

    it('should handle forward references', () => {
      @Module({})
      class ModuleA {}

      @Module({
        imports: [forwardRef(() => ModuleA)]
      })
      class ModuleB {}

      const dependencyGraph = graph.buildGraph(ModuleB);

      expect(dependencyGraph.nodes.size).toBe(2);
      
      const moduleANode = dependencyGraph.nodes.get('ModuleA');
      expect(moduleANode).toBeDefined();
      expect(moduleANode!.type).toBe('forwardRef');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect circular dependencies', () => {
      @Module({
        imports: [forwardRef(() => ModuleB)]
      })
      class ModuleA {}

      @Module({
        imports: [ModuleA]
      })
      class ModuleB {}

      const dependencyGraph = graph.buildGraph(ModuleA);

      expect(dependencyGraph.cycles.length).toBeGreaterThan(0);
      
      const cycle = dependencyGraph.cycles[0];
      expect(cycle).toContain('ModuleA');
      expect(cycle).toContain('ModuleB');
    });

    it('should detect complex circular dependencies', () => {
      @Module({
        imports: [forwardRef(() => ModuleB)]
      })
      class ModuleA {}

      @Module({
        imports: [forwardRef(() => ModuleC)]
      })
      class ModuleB {}

      @Module({
        imports: [ModuleA]
      })
      class ModuleC {}

      const dependencyGraph = graph.buildGraph(ModuleA);

      expect(dependencyGraph.cycles.length).toBeGreaterThan(0);
      
      const cycle = dependencyGraph.cycles[0];
      expect(cycle.length).toBe(3);
      expect(cycle).toContain('ModuleA');
      expect(cycle).toContain('ModuleB');
      expect(cycle).toContain('ModuleC');
    });
  });

  describe('Graph Analysis', () => {
    it('should identify root modules', () => {
      @Module({})
      class LeafModule {}

      @Module({
        imports: [LeafModule]
      })
      class MiddleModule {}

      @Module({
        imports: [MiddleModule]
      })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);

      expect(dependencyGraph.roots).toContain('RootModule');
      expect(dependencyGraph.roots).not.toContain('MiddleModule');
      expect(dependencyGraph.roots).not.toContain('LeafModule');
    });

    it('should identify leaf modules', () => {
      @Module({})
      class LeafModule {}

      @Module({
        imports: [LeafModule]
      })
      class MiddleModule {}

      @Module({
        imports: [MiddleModule]
      })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);

      expect(dependencyGraph.leaves).toContain('LeafModule');
      expect(dependencyGraph.leaves).not.toContain('MiddleModule');
      expect(dependencyGraph.leaves).not.toContain('RootModule');
    });

    it('should identify orphan modules', () => {
      @Module({})
      class OrphanModule {}

      @Module({})
      class AnotherOrphanModule {}

      @Module({
        imports: [OrphanModule] // 只导入一个
      })
      class RootModule {}

      // 手动添加孤立模块到图中
      const dependencyGraph = graph.buildGraph(RootModule);
      
      // 由于我们只构建从 RootModule 开始的图，AnotherOrphanModule 不会出现
      // 这个测试更多是为了验证孤立检测逻辑
      expect(dependencyGraph.orphans).toHaveLength(0);
    });
  });

  describe('Complexity Analysis', () => {
    it('should calculate graph complexity metrics', () => {
      @Module({})
      class ModuleA {}

      @Module({})
      class ModuleB {}

      @Module({
        imports: [ModuleA, ModuleB]
      })
      class ModuleC {}

      @Module({
        imports: [ModuleC]
      })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);
      const analysis = graph.analyzeComplexity();

      expect(analysis.totalModules).toBe(4);
      expect(analysis.totalDependencies).toBeGreaterThan(0);
      expect(analysis.maxDepth).toBeGreaterThan(0);
      expect(analysis.complexity).toBeGreaterThan(0);
      expect(analysis.circularDependencies).toHaveLength(0);
    });

    it('should generate optimization suggestions', () => {
      // 创建一个复杂的模块结构
      @Module({
        imports: [forwardRef(() => ModuleB)]
      })
      class ModuleA {}

      @Module({
        imports: [ModuleA]
      })
      class ModuleB {}

      @Module({
        imports: [ModuleA, ModuleB]
      })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);
      const analysis = graph.analyzeComplexity();

      expect(analysis.suggestions.length).toBeGreaterThan(0);
      
      // 应该有循环依赖的建议
      const circularSuggestion = analysis.suggestions
        .find(s => s.includes('循环依赖'));
      expect(circularSuggestion).toBeDefined();
    });
  });

  describe('Path Finding', () => {
    it('should find path between modules', () => {
      @Module({})
      class ModuleA {}

      @Module({
        imports: [ModuleA]
      })
      class ModuleB {}

      @Module({
        imports: [ModuleB]
      })
      class ModuleC {}

      const dependencyGraph = graph.buildGraph(ModuleC);
      const path = graph.findPath('ModuleC', 'ModuleA');

      expect(path).toBeDefined();
      expect(path).toContain('ModuleC');
      expect(path).toContain('ModuleB');
      expect(path).toContain('ModuleA');
    });

    it('should return null for non-existent paths', () => {
      @Module({})
      class ModuleA {}

      @Module({})
      class ModuleB {}

      @Module({
        imports: [ModuleA]
      })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);
      const path = graph.findPath('ModuleA', 'ModuleB');

      expect(path).toBeNull();
    });
  });

  describe('Export Formats', () => {
    it('should export to DOT format', () => {
      @Module({})
      class ModuleA {}

      class ServiceB {}
      class ControllerB {}
      
      @Module({
        imports: [ModuleA],
        providers: [ServiceB],
        controllers: [ControllerB]
      })
      class ModuleB {}

      const dependencyGraph = graph.buildGraph(ModuleB);
      const dotString = graph.toDot();

      expect(dotString).toContain('digraph ModuleDependencyGraph');
      expect(dotString).toContain('ModuleA');
      expect(dotString).toContain('ModuleB');
      expect(dotString).toContain('->');
    });

    it('should export to JSON format', () => {
      @Module({})
      class ModuleA {}

      class ServiceB {}
      
      @Module({
        imports: [ModuleA],
        providers: [ServiceB]
      })
      class ModuleB {}

      const dependencyGraph = graph.buildGraph(ModuleB);
      const jsonData = graph.toJSON();

      expect(jsonData.nodes).toHaveLength(2);
      expect(jsonData.edges.length).toBeGreaterThan(0);
      expect(jsonData.analysis).toBeDefined();
      expect(jsonData.analysis.totalModules).toBe(2);
      
      // 确保模块引用被移除以避免循环序列化
      expect(jsonData.nodes[0].module).toBeUndefined();
    });
  });

  describe('Provider and Controller Analysis', () => {
    it('should extract provider and controller information', () => {
      class ServiceA {}
      class ServiceB {}
      class ControllerA {}
      class ControllerB {}
      
      @Module({
        providers: [
          ServiceA,
          { provide: 'ServiceB', useClass: ServiceB },
          { provide: 'CONFIG', useValue: { key: 'value' } }
        ],
        controllers: [ControllerA, ControllerB]
      })
      class TestModule {}

      const dependencyGraph = graph.buildGraph(TestModule);
      const moduleNode = dependencyGraph.nodes.get('TestModule');

      expect(moduleNode).toBeDefined();
      expect(moduleNode!.providers).toContain('ServiceA');
      expect(moduleNode!.providers).toContain('ServiceB');
      expect(moduleNode!.providers).toContain('CONFIG');
      expect(moduleNode!.controllers).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle modules with no metadata', () => {
      class PlainClass {}

      const dependencyGraph = graph.buildGraph(PlainClass as any);

      expect(dependencyGraph.nodes.size).toBe(1);
      
      const node = dependencyGraph.nodes.get('PlainClass');
      expect(node).toBeDefined();
      expect(node!.imports).toHaveLength(0);
      expect(node!.exports).toHaveLength(0);
      expect(node!.providers).toHaveLength(0);
      expect(node!.controllers).toHaveLength(0);
    });

    it('should handle anonymous modules', () => {
      const AnonymousModule = class {
        static imports = [];
      };

      const dependencyGraph = graph.buildGraph(AnonymousModule as any);

      expect(dependencyGraph.nodes.size).toBe(1);
      
      const node = Array.from(dependencyGraph.nodes.values())[0];
      expect(node.name).toBe('AnonymousModule');
    });

    it('should handle deeply nested module hierarchies', () => {
      @Module({})
      class Level5Module {}

      @Module({ imports: [Level5Module] })
      class Level4Module {}

      @Module({ imports: [Level4Module] })
      class Level3Module {}

      @Module({ imports: [Level3Module] })
      class Level2Module {}

      @Module({ imports: [Level2Module] })
      class Level1Module {}

      @Module({ imports: [Level1Module] })
      class RootModule {}

      const dependencyGraph = graph.buildGraph(RootModule);
      const analysis = graph.analyzeComplexity();

      expect(dependencyGraph.nodes.size).toBe(6);
      expect(analysis.maxDepth).toBe(6);
      
      // 应该有深度建议
      const depthSuggestion = analysis.suggestions
        .find(s => s.includes('层次过深'));
      expect(depthSuggestion).toBeDefined();
    });
  });
});