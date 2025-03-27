import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import { handleControllerHttpException } from "src/shared/utils/handleControllerHttpException";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { UsersService } from "./users.service";
@Controller("users")
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) { }

  @Post("test")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async testProtectedRoute(@CurrentUser() user: JwtPayload) {
    try {
      return {
        message: "Route protégée accessible",
        userId: user.sub,
        email: user.email,
      };
    } catch (error) {
      handleControllerHttpException(error);
    }
  }
}
