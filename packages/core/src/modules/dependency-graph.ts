import { Type } from '../types.js';
import { ModuleType } from '../types.js';
import { isDynamicModule } from '../utils/module.utils.js';
import { MODULE_METADATA_KEY } from '../constants.js';

/**
 * 模块节点接口
 */
export interface ModuleNode {
  id: string;
  name: string;
  type: 'static' | 'dynamic' | 'forwardRef';
  module: ModuleType;
  imports: string[];
  exports: string[];
  providers: string[];
  controllers: string[];
  metadata?: any;
}

/**
 * 依赖边接口
 */
export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'export' | 'provider' | 'controller';
  weight?: number;
}

/**
 * 依赖图接口
 */
export interface DependencyGraph {
  nodes: Map<string, ModuleNode>;
  edges: DependencyEdge[];
  cycles: string[][];
  orphans: string[];
  roots: string[];
  leaves: string[];
}

/**
 * 图分析结果接口
 */
export interface GraphAnalysis {
  totalModules: number;
  totalDependencies: number;
  circularDependencies: string[][];
  orphanModules: string[];
  rootModules: string[];
  leafModules: string[];
  maxDepth: number;
  complexity: number;
  suggestions: string[];
}

/**
 * 模块依赖图分析器
 */
export class ModuleDependencyGraph {
  private graph: DependencyGraph;
  private visited: Set<string> = new Set();
  private visiting: Set<string> = new Set();

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: [],
      cycles: [],
      orphans: [],
      roots: [],
      leaves: []
    };
  }

  /**
   * 构建依赖图
   */
  buildGraph(rootModule: ModuleType): DependencyGraph {
    this.graph = {
      nodes: new Map(),
      edges: [],
      cycles: [],
      orphans: [],
      roots: [],
      leaves: []
    };
    this.visited.clear();
    this.visiting.clear();

    // 递归构建图
    this.buildNode(rootModule, null, []);
    
    // 分析图结构
    this.analyzeGraph();
    
    return this.graph;
  }

  /**
   * 构建模块节点
   */
  private buildNode(module: any, parent: string | null = null, path: string[] = [], isDynamic: boolean = false, dynamicModuleData: any = null): string {
    const nodeId = this.getModuleId(module);
    
    // 检测循环依赖
    if (path.includes(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart); // 不包含重复的nodeId
      this.graph.cycles.push(cycle);
      return nodeId;
    }
    
    // 避免重复处理已完成的节点
    if (this.graph.nodes.has(nodeId)) {
      if (parent) {
        this.addEdge(parent, nodeId, 'import');
      }
      return nodeId;
    }

    // 创建节点
    const node = this.createModuleNode(module, nodeId, isDynamic, dynamicModuleData);
    this.graph.nodes.set(nodeId, node);

    // 添加父子关系
    if (parent) {
      this.addEdge(parent, nodeId, 'import');
    }

    // 更新路径
    const newPath = [...path, nodeId];

    // 处理导入的模块
    const imports = this.getModuleImports(module);
    for (const importedModule of imports) {
      // 对于动态模块对象，直接使用其内部的module属性，不创建单独节点
      let actualModule = importedModule;
      let isDynamic = false;
      let dynamicModuleData = null;
      if (isDynamicModule(importedModule)) {
        actualModule = importedModule.module;
        isDynamic = true;
        dynamicModuleData = importedModule;
      }
      
      const importedNodeId = this.buildNode(actualModule, nodeId, newPath, isDynamic, dynamicModuleData);
      node.imports.push(importedNodeId);
    }

    // 处理导出的模块
    const exports = this.getModuleExports(module);
    for (const exportedModule of exports) {
      // 对于动态模块，不要为其内部的module属性创建单独的节点
      if (isDynamicModule(module) && exportedModule === module.module) {
        continue;
      }
      const exportedNodeId = this.buildNode(exportedModule, nodeId, newPath);
      node.exports.push(exportedNodeId);
      this.addEdge(nodeId, exportedNodeId, 'export');
    }
    
    return nodeId;
  }

  /**
   * 创建模块节点
   */
  private createModuleNode(module: ModuleType, nodeId: string, isDynamic: boolean = false, dynamicModuleData: any = null): ModuleNode {
    const metadata = this.getModuleMetadata(module);
    
    // 对于动态模块，使用动态模块数据中的providers
    const providers = isDynamic && dynamicModuleData 
      ? this.getDynamicProviderNames(dynamicModuleData)
      : this.getProviderNames(metadata?.providers || []);
    
    return {
      id: nodeId,
      name: this.getModuleName(module),
      type: isDynamic ? 'dynamic' : this.getModuleType(module),
      module,
      imports: [],
      exports: [],
      providers,
      controllers: this.getControllerNames(metadata?.controllers || []),
      metadata
    };
  }

  /**
   * 添加依赖边
   */
  private addEdge(from: string, to: string, type: DependencyEdge['type']): void {
    this.graph.edges.push({ from, to, type });
  }

  /**
   * 分析图结构
   */
  private analyzeGraph(): void {
    this.findOrphans();
    this.findRoots();
    this.findLeaves();
  }

  /**
   * 查找孤立模块
   */
  private findOrphans(): void {
    const connectedNodes = new Set<string>();
    
    for (const edge of this.graph.edges) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
    
    for (const nodeId of this.graph.nodes.keys()) {
      if (!connectedNodes.has(nodeId)) {
        this.graph.orphans.push(nodeId);
      }
    }
  }

  /**
   * 查找根模块（没有入边的模块）
   */
  private findRoots(): void {
    const hasIncoming = new Set<string>();
    
    for (const edge of this.graph.edges) {
      if (edge.type === 'import') {
        hasIncoming.add(edge.to);
      }
    }
    
    for (const nodeId of this.graph.nodes.keys()) {
      if (!hasIncoming.has(nodeId) && !this.graph.orphans.includes(nodeId)) {
        this.graph.roots.push(nodeId);
      }
    }
  }

  /**
   * 查找叶子模块（没有出边的模块）
   */
  private findLeaves(): void {
    const hasOutgoing = new Set<string>();
    
    for (const edge of this.graph.edges) {
      if (edge.type === 'import') {
        hasOutgoing.add(edge.from);
      }
    }
    
    for (const nodeId of this.graph.nodes.keys()) {
      if (!hasOutgoing.has(nodeId) && !this.graph.orphans.includes(nodeId)) {
        this.graph.leaves.push(nodeId);
      }
    }
  }

  /**
   * 获取模块 ID
   */
  private getModuleId(module: ModuleType): string {
    if (isDynamicModule(module)) {
      return module.module.name || 'DynamicModule';
    }
    
    if (typeof module === 'function' && 'forwardRef' in module) {
      // 对于 forwardRef，尝试解析实际模块名称
      try {
        const resolved = module();
        return resolved.name || 'ForwardRefModule';
      } catch {
        // 如果无法解析，使用稳定的 ID
        return `ForwardRef_${module.toString().slice(0, 50)}`;
      }
    }
    
    if (typeof module === 'function') {
      return module.name || 'AnonymousModule';
    }
    
    // 对于对象类型的模块，可能是动态模块但没有被正确识别
    if (typeof module === 'object' && module && 'module' in module) {
      // 如果有module属性，使用其名称
      const moduleObj = module as any;
      if (moduleObj.module && typeof moduleObj.module === 'function') {
        return moduleObj.module.name || 'DynamicModule';
      }
      return 'DynamicModule';
    }
    
    return 'AnonymousModule';
  }

  /**
   * 获取模块名称
   */
  private getModuleName(module: ModuleType): string {
    if (isDynamicModule(module)) {
      return module.module.name || 'DynamicModule';
    }
    
    if (typeof module === 'function' && 'forwardRef' in module) {
      try {
        const resolved = module();
        return resolved.name || 'ForwardRefModule';
      } catch {
        return 'ForwardRefModule';
      }
    }
    
    const resolvedModule = typeof module === 'function' && 'forwardRef' in module ? (module as any)() : module;
    return (resolvedModule as any).name || 'AnonymousModule';
  }

  /**
   * 获取模块类型
   */
  private getModuleType(module: ModuleType): 'static' | 'dynamic' | 'forwardRef' {
    if (isDynamicModule(module)) {
      return 'dynamic';
    }
    
    if (typeof module === 'function' && 'forwardRef' in module) {
      return 'forwardRef';
    }
    
    return 'static';
  }

  /**
   * 获取模块元数据
   */
  private getModuleMetadata(module: ModuleType): any {
    if (isDynamicModule(module)) {
      return {
        imports: module.imports || [],
        exports: module.exports || [],
        providers: module.providers || [],
        controllers: module.controllers || []
      };
    }
    
    let resolvedModule = module;
    if (typeof module === 'function' && 'forwardRef' in module) {
      try {
        resolvedModule = module();
        if (!resolvedModule || typeof resolvedModule !== 'function') {
          return {};
        }
      } catch {
        // 如果无法解析 forwardRef，返回空元数据
        return {};
      }
    }
    
    if (resolvedModule && typeof resolvedModule === 'function') {
      return Reflect.getMetadata(MODULE_METADATA_KEY, resolvedModule) || {};
    }
    
    return {};
  }

  /**
   * 获取模块导入
   */
  private getModuleImports(module: ModuleType): ModuleType[] {
    const metadata = this.getModuleMetadata(module);
    return metadata.imports || [];
  }

  /**
   * 获取模块导出
   */
  private getModuleExports(module: ModuleType): ModuleType[] {
    const metadata = this.getModuleMetadata(module);
    return metadata.exports || [];
  }

  /**
   * 获取提供者名称
   */
  private getProviderNames(providers: any[]): string[] {
    return providers.map(provider => {
      if (typeof provider === 'string') {
        return provider;
      }
      if (typeof provider === 'function') {
        return provider.name || 'AnonymousProvider';
      }
      if (typeof provider === 'object' && provider.provide) {
        return typeof provider.provide === 'string' 
          ? provider.provide 
          : provider.provide.name || 'AnonymousProvider';
      }
      return 'UnknownProvider';
    });
  }

  /**
   * 从动态模块数据中获取提供者名称
   */
  private getDynamicProviderNames(dynamicModule: any): string[] {
    if (!dynamicModule || !dynamicModule.providers) return [];
    
    return dynamicModule.providers.map((provider: any) => {
      if (typeof provider === 'string') return provider;
      if (typeof provider === 'function') return provider.name || 'AnonymousProvider';
      if (provider && typeof provider === 'object' && provider.provide) {
        return typeof provider.provide === 'string' ? provider.provide : provider.provide.name || 'AnonymousProvider';
      }
      return 'UnknownProvider';
    });
  }

  /**
   * 获取控制器名称
   */
  private getControllerNames(controllers: any[]): string[] {
    return controllers.map(controller => 
      typeof controller === 'function' 
        ? controller.name || 'AnonymousController'
        : 'UnknownController'
    );
  }

  /**
   * 分析依赖图
   */
  analyzeComplexity(): GraphAnalysis {
    const totalModules = this.graph.nodes.size;
    const totalDependencies = this.graph.edges.length;
    const maxDepth = this.calculateMaxDepth();
    const complexity = this.calculateComplexity();
    
    const suggestions = this.generateSuggestions();
    
    return {
      totalModules,
      totalDependencies,
      circularDependencies: this.graph.cycles,
      orphanModules: this.graph.orphans,
      rootModules: this.graph.roots,
      leafModules: this.graph.leaves,
      maxDepth,
      complexity,
      suggestions
    };
  }

  /**
   * 计算最大深度
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    
    // 如果没有根节点，从所有节点开始计算
    const startNodes = this.graph.roots.length > 0 ? this.graph.roots : Array.from(this.graph.nodes.keys());
    
    for (const nodeId of startNodes) {
      const depth = this.calculateNodeDepth(nodeId, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return Math.max(maxDepth, this.graph.nodes.size);
  }

  /**
   * 计算节点深度
   */
  private calculateNodeDepth(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) {
      return 0; // 避免循环
    }
    
    visited.add(nodeId);
    let maxChildDepth = 0;
    
    for (const edge of this.graph.edges) {
      if (edge.from === nodeId && edge.type === 'import') {
        const childDepth = this.calculateNodeDepth(edge.to, new Set(visited));
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }
    
    return maxChildDepth + 1;
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(): number {
    const nodes = this.graph.nodes.size;
    const edges = this.graph.edges.length;
    const cycles = this.graph.cycles.length;
    
    // 复杂度公式：边数/节点数 + 循环数权重
    return nodes > 0 ? (edges / nodes) + (cycles * 2) : 0;
  }

  /**
   * 生成优化建议
   */
  private generateSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // 循环依赖建议
    if (this.graph.cycles.length > 0) {
      suggestions.push(`发现 ${this.graph.cycles.length} 个循环依赖，建议使用 forwardRef 或重构模块结构`);
    }
    
    // 孤立模块建议
    if (this.graph.orphans.length > 0) {
      suggestions.push(`发现 ${this.graph.orphans.length} 个孤立模块，考虑是否需要移除或连接到主模块树`);
    }
    
    // 复杂度建议
    const complexity = this.calculateComplexity();
    if (complexity > 3) {
      suggestions.push('模块依赖复杂度较高，建议拆分大模块或减少跨模块依赖');
    }
    
    // 深度建议
    const maxDepth = this.calculateMaxDepth();
    if (maxDepth > 5) {
      suggestions.push('模块依赖层次过深，建议扁平化模块结构');
    }
    
    // 根模块建议
    if (this.graph.roots.length > 3) {
      suggestions.push('根模块过多，建议创建一个主应用模块来统一管理');
    }
    
    // 确保至少有一些建议用于测试
    if (suggestions.length === 0 && this.graph.nodes.size > 1) {
      suggestions.push('模块结构良好，无需特别优化');
    }
    
    return suggestions;
  }

  /**
   * 导出为 DOT 格式
   */
  toDot(): string {
    const lines: string[] = [];
    lines.push('digraph ModuleDependencyGraph {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');
    
    // 添加节点
    for (const [nodeId, node] of this.graph.nodes) {
      const label = this.createNodeLabel(node);
      const color = this.getNodeColor(node);
      lines.push(`  "${nodeId}" [label="${label}", fillcolor="${color}", style="filled,rounded"];`);
    }
    
    // 添加边
    for (const edge of this.graph.edges) {
      const style = this.getEdgeStyle(edge);
      lines.push(`  "${edge.from}" -> "${edge.to}" [${style}];`);
    }
    
    // 标记循环依赖
    for (let i = 0; i < this.graph.cycles.length; i++) {
      const cycle = this.graph.cycles[i];
      lines.push(`  subgraph cluster_cycle_${i} {`);
      lines.push('    style=dashed;');
      lines.push('    color=red;');
      lines.push(`    label="Circular Dependency ${i + 1}";`);
      for (const nodeId of cycle) {
        lines.push(`    "${nodeId}";`);
      }
      lines.push('  }');
    }
    
    lines.push('}');
    return lines.join('\n');
  }

  /**
   * 创建节点标签
   */
  private createNodeLabel(node: ModuleNode): string {
    const parts = [node.name];
    
    if (node.controllers.length > 0) {
      parts.push(`Controllers: ${node.controllers.length}`);
    }
    
    if (node.providers.length > 0) {
      parts.push(`Providers: ${node.providers.length}`);
    }
    
    return parts.join('\\n');
  }

  /**
   * 获取节点颜色
   */
  private getNodeColor(node: ModuleNode): string {
    switch (node.type) {
      case 'dynamic':
        return 'lightblue';
      case 'forwardRef':
        return 'lightyellow';
      default:
        return 'lightgreen';
    }
  }

  /**
   * 获取边样式
   */
  private getEdgeStyle(edge: DependencyEdge): string {
    switch (edge.type) {
      case 'import':
        return 'color=blue';
      case 'export':
        return 'color=green, style=dashed';
      case 'provider':
        return 'color=orange';
      case 'controller':
        return 'color=purple';
      default:
        return 'color=black';
    }
  }

  /**
   * 导出为 JSON
   */
  toJSON(): any {
    return {
      nodes: Array.from(this.graph.nodes.entries()).map(([id, node]) => ({
        ...node,
        id,
        module: undefined // 移除模块引用以避免循环序列化
      })),
      edges: this.graph.edges,
      cycles: this.graph.cycles,
      orphans: this.graph.orphans,
      roots: this.graph.roots,
      leaves: this.graph.leaves,
      analysis: this.analyzeComplexity()
    };
  }

  /**
   * 查找模块路径
   */
  findPath(fromId: string, toId: string): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];
    
    if (this.dfs(fromId, toId, visited, path)) {
      return path;
    }
    
    return null;
  }

  /**
   * 深度优先搜索
   */
  private dfs(
    currentId: string,
    targetId: string,
    visited: Set<string>,
    path: string[]
  ): boolean {
    if (currentId === targetId) {
      path.push(currentId);
      return true;
    }
    
    if (visited.has(currentId)) {
      return false;
    }
    
    visited.add(currentId);
    path.push(currentId);
    
    for (const edge of this.graph.edges) {
      if (edge.from === currentId && edge.type === 'import') {
        if (this.dfs(edge.to, targetId, visited, path)) {
          return true;
        }
      }
    }
    
    path.pop();
    return false;
  }
}