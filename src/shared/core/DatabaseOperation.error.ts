import { HttpException, HttpStatus } from "@nestjs/common";

export class DatabaseOperationError extends HttpException {
  constructor(message: string, options?: ErrorOptions) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}
