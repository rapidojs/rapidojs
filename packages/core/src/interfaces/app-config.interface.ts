/**
 * Configuration options for static file serving
 */
export interface StaticFileConfig {
  /**
   * Root directory for static files
   */
  root: string;
  
  /**
   * URL prefix for static files (default: '/public/')
   */
  prefix?: string;
  
  /**
   * Default file to serve for directory requests.
   * - `false` (default): disable serving a default file.
   * - `true`: serve 'index.html'.
   * - `string`: serve a specific file, e.g., 'default.html'.
   * - `string[]`: try a list of files, e.g., ['index.html', 'index.htm'].
   */
  index?: boolean | string | string[];
}

/**
 * Application configuration options
 */
export interface AppConfig {
  /**
   * Static file serving configuration
   */
    staticFiles?: StaticFileConfig[];
  
  /**
   * Custom Fastify options
   */
  fastifyOptions?: any;
}
