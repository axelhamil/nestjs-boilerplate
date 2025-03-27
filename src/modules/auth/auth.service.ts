import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcrypt";
import { UsersService } from "../users/users.service";
import type { LoginDto } from "./dtos/login.dto";
import { RegisterDto } from "./dtos/register.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

interface TokensInternal {
  accessToken: string;
  refreshToken: string;
}

export type SignInData = {
  id: string;
  email: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) { }

  async register(registerDto: RegisterDto): Promise<TokensInternal> {
    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.usersService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async login(loginDto: LoginDto): Promise<TokensInternal> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const isPasswordValid = await this.comparePasswords(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokensInternal> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Accès refusé');
    }

    const isRefreshTokenValid = await this.comparePasswords(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Accès refusé');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
    });

    return tokens;
  }

  async logout(userId: string): Promise<boolean> {
    await this.usersService.updateRefreshToken(userId, null);
    return true;
  }

  decodeRefreshToken(refreshToken: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET')
        }
      );
    } catch (error) {
      this.logger.error(`Error decoding refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET')
      });
    } catch (error) {
      this.logger.error(`Error verifying access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  private async hashPassword(plainText: string): Promise<string> {
    try {
      return await hash(plainText, 10);
    } catch (error) {
      this.logger.error(`Error hashing password: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('Erreur lors du hachage du mot de passe');
    }
  }

  private async comparePasswords(plainText: string, hashedText: string): Promise<boolean> {
    try {
      return await compare(plainText, hashedText);
    } catch (error) {
      this.logger.error(`Error comparing passwords: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('Erreur lors de la vérification du mot de passe');
    }
  }

  private async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    if (refreshToken) {
      const hashedRefreshToken = await this.hashPassword(refreshToken);
      await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
    } else {
      await this.usersService.updateRefreshToken(userId, null);
    }
  }

  private async generateTokens(data: SignInData): Promise<TokensInternal> {
    const jwtPayload: JwtPayload = {
      sub: data.id,
      email: data.email,
    };

    const accessTokenExpiration = '1m';
    const refreshTokenExpiration = '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        jwtPayload,
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: accessTokenExpiration,
        }
      ),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken
    };
  }

  async compareRefreshTokens(
    storedToken: string,
    userToken: string,
  ): Promise<boolean> {
    try {
      return await compare(storedToken, userToken);
    } catch (error) {
      this.logger.error(`Error comparing refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('Erreur lors de la comparaison des jetons de rafraîchissement');
    }
  }
}
