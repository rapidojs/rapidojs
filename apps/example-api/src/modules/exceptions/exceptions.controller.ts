import { Controller, Get, BadRequestException, NotFoundException, InternalServerErrorException, UnauthorizedException } from '@rapidojs/core';
import { CustomException } from './custom.exception.js';

@Controller('exceptions')
export class ExceptionsController {
  @Get('unauthorized')
  triggerUnauthorized() {
    throw new UnauthorizedException();
  }

  @Get('bad-request')
  triggerBadRequest() {
    throw new BadRequestException('This is a bad request.');
  }

  @Get('not-found')
  triggerNotFound() {
    throw new NotFoundException();
  }

  @Get('internal-server-error')
  triggerInternalServerError() {
    throw new InternalServerErrorException();
  }

  @Get('custom')
  triggerCustomException() {
    throw new CustomException();
  }

  @Get('unhandled')
  triggerUnhandledException() {
    throw new Error('This is an unhandled error.');
  }
}
