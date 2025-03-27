import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { DatabaseOperationError } from "./DatabaseOperation.error";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (exception instanceof DatabaseOperationError) {
      return response.status(status).json({
        statusCode: status,
        message: "Error",
        error: message,
        timestamp: new Date().toISOString(),
        data: null,
      });
    }

    return response.status(status).json({
      statusCode: status,
      message: "Error",
      error: message,
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
}
