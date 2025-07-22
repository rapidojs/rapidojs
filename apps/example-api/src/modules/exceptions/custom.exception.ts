import { HttpException, HttpStatus } from '@rapidojs/core';

export class CustomException extends HttpException {
  constructor() {
    super('This is a custom exception.', HttpStatus.I_AM_A_TEAPOT);
  }
}
