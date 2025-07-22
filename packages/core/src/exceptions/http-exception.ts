export class HttpException extends Error {
  /**
   * The HTTP response object or message.
   */
  private readonly response: string | object;

  /**
   * The HTTP status code.
   */
  private readonly status: number;

  /**
   * Constructor for HttpException.
   *
   * @param response The response message or object.
   * @param status The HTTP status code.
   */
  constructor(response: string | object, status: number) {
    super();
    this.response = response;
    this.status = status;
    this.initMessage();
  }

  /**
   * Initializes the error message.
   */
  public initMessage() {
    if (typeof this.response === 'string') {
      this.message = this.response;
    } else if (
      typeof this.response === 'object' &&
      this.response !== null &&
      'message' in this.response &&
      typeof (this.response as any).message === 'string'
    ) {
      this.message = (this.response as any).message;
    } else if (this.constructor) {
      const defaultMessage = this.constructor.name.match(/[A-Z][a-z]+|[0-9]+/g)?.join(' ') || 'Error';
      this.message = defaultMessage;
    }
  }

  /**
   * Gets the HTTP response.
   *
   * @returns The response message or object.
   */
  public getResponse(): string | object {
    return this.response;
  }

  /**
   * Gets the HTTP status code.
   *
   * @returns The HTTP status code.
   */
  public getStatus(): number {
    return this.status;
  }
}
