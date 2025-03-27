import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { handleControllerHttpException } from "src/shared/utils/handleControllerHttpException";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dtos/login.dto";
import { RegisterDto } from "./dtos/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { Tokens } from "./interfaces/tokens.interface";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
  ) { }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    const refreshTokenDuration = 7 * 24 * 60 * 60 * 1000; // 7d

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,          // Not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'strict',      // CSRF protection
      maxAge: refreshTokenDuration,
      path: '/',              // Available on all routes
    });
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<Tokens> {
    try {
      const tokens = await this.authService.register(registerDto);

      this.setRefreshTokenCookie(res, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      handleControllerHttpException(error);
    }
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<Tokens> {
    try {
      const tokens = await this.authService.login(loginDto);

      this.setRefreshTokenCookie(res, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      handleControllerHttpException(error);
    }
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<Tokens> {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token non trouvé');
      }

      const decodedToken = this.authService.decodeRefreshToken(refreshToken);
      const tokens = await this.authService.refreshTokens(decodedToken.sub, refreshToken);

      this.setRefreshTokenCookie(res, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      handleControllerHttpException(error);
    }
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.authService.logout(user.sub);

      res.clearCookie('refresh_token', { path: '/' });

      return { success };
    } catch (error) {
      handleControllerHttpException(error);
    }
  }
}
