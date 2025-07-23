// 导出本地的 Controller 装饰器（集成了 tsyringe）
export { Controller } from '@rapidojs/common';

// 重新导出来自 common 包的其他装饰器
export {
  Get, Post, Put, Delete, Patch,
  Query, Param, Headers, Body, Req, Res,
  UsePipes, QueryWithPipe, ParamWithPipe, BodyWithPipe,
  Module, Injectable, Inject, Catch
} from '@rapidojs/common';
