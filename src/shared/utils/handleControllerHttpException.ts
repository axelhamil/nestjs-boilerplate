import { InternalServerErrorException } from "@nestjs/common";

import { HttpException } from "@nestjs/common";

export function handleControllerHttpException(error: unknown): never {
  if (error instanceof HttpException) throw error;

  const errorMessage =
    error instanceof Error ? error.message : "Internal server error";

  throw new InternalServerErrorException(errorMessage);
}
