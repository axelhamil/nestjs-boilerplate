import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "../../users/users.service";
import { AuthService } from "../auth.service";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) { }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      throw new UnauthorizedException("Authentification requise");
    }

    let accessPayload: JwtPayload;
    try {
      accessPayload = this.authService.verifyAccessToken(accessToken);
    } catch (error) {
      Logger.error(
        `Access token verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw new UnauthorizedException("Token d'accès invalide");
    }

    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException("Session expirée");
    }

    try {
      const refreshPayload = this.authService.decodeRefreshToken(refreshToken);

      if (accessPayload.sub !== refreshPayload.sub) {
        throw new UnauthorizedException("Session invalide");
      }

      const user = await this.usersService.findById(accessPayload.sub);

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException("Session révoquée ou expirée");
      }

      const refreshTokensMatch = await this.authService.compareRefreshTokens(
        refreshToken,
        user.refreshToken
      );

      if (!refreshTokensMatch) {
        throw new UnauthorizedException("Session révoquée ou invalide");
      }

      request.user = accessPayload;
      return true;
    } catch (error) {
      Logger.error(
        `JWT verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw new UnauthorizedException("Session invalide ou expirée");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
