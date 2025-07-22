export interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
}

export interface ArgumentsHost {
  switchToHttp(): HttpArgumentsHost;
}
