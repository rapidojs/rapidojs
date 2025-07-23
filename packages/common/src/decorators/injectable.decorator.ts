import 'reflect-metadata';

export function Injectable(): ClassDecorator {
  return (target: object) => {
    // This decorator is used as a marker for the DI container.
  };
} 