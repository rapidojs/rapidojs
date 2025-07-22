import { HttpException } from './http-exception.js';

export class BadRequestException extends HttpException {
  constructor(response: string | object = 'Bad Request') {
    super(response, 400);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(response: string | object = 'Unauthorized') {
    super(response, 401);
  }
}

export class ForbiddenException extends HttpException {
  constructor(response: string | object = 'Forbidden') {
    super(response, 403);
  }
}

export class NotFoundException extends HttpException {
  constructor(response: string | object = 'Not Found') {
    super(response, 404);
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(response: string | object = 'Method Not Allowed') {
    super(response, 405);
  }
}

export class NotAcceptableException extends HttpException {
  constructor(response: string | object = 'Not Acceptable') {
    super(response, 406);
  }
}

export class RequestTimeoutException extends HttpException {
  constructor(response: string | object = 'Request Timeout') {
    super(response, 408);
  }
}

export class ConflictException extends HttpException {
  constructor(response: string | object = 'Conflict') {
    super(response, 409);
  }
}

export class GoneException extends HttpException {
  constructor(response: string | object = 'Gone') {
    super(response, 410);
  }
}

export class PayloadTooLargeException extends HttpException {
  constructor(response: string | object = 'Payload Too Large') {
    super(response, 413);
  }
}

export class UnsupportedMediaTypeException extends HttpException {
  constructor(response: string | object = 'Unsupported Media Type') {
    super(response, 415);
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(response: string | object = 'Unprocessable Entity') {
    super(response, 422);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(response: string | object = 'Internal Server Error') {
    super(response, 500);
  }
}

export class NotImplementedException extends HttpException {
  constructor(response: string | object = 'Not Implemented') {
    super(response, 501);
  }
}

export class BadGatewayException extends HttpException {
  constructor(response: string | object = 'Bad Gateway') {
    super(response, 502);
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(response: string | object = 'Service Unavailable') {
    super(response, 503);
  }
}

export class GatewayTimeoutException extends HttpException {
  constructor(response: string | object = 'Gateway Timeout') {
    super(response, 504);
  }
}
