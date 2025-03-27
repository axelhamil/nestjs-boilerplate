import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import { type Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        Logger.log(
          `📤 [Response] ${method} ${url} - Completed in ${duration}ms`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        Logger.error(
          `❌ [Error] ${method} ${url} - Failed after ${duration}ms\n` +
          `Error: ${errorMessage}\n` +
          `Stack: ${error?.stack || 'No stack trace available'}`
        );

        return throwError(() => error);
      }),
    );
  }
}
