import "dotenv/config";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import cookieParser from "cookie-parser";
import os from "node:os";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./shared/core/HttpException.filter";
import { LoggingInterceptor } from "./shared/core/Logging.interceptor";
import { ResponseInterceptor } from "./shared/core/Response.interceptor";

const port = process.env.PORT || 8080;

async function bootstrap(): Promise<void> {
  const startTime = new Date();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(error => {
          const constraints = Object.values(error.constraints || {});
          return `${error.property}: ${constraints.join(', ')}`;
        });
        return new Error(messages.join('; '));
      },
    }),
  );

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new LoggingInterceptor(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Configure server
  app.use(compression());
  app.use(cookieParser());
  app.setGlobalPrefix("/api");
  app.enableCors({
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    optionsSuccessStatus: 204,
    origin: "*",
    preflightContinue: false,
  });

  // Start server
  await app.listen(port, () => {
    const endTime = new Date();
    const startupTime = endTime.getTime() - startTime.getTime();
    Logger.log(
      `Server running on ${os.hostname()}:${port}. Started in \x1b[33m+${startupTime}ms\x1b[0m`,
    );
  });
}
bootstrap();
