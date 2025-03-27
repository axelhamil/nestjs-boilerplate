import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DatabaseOperationError } from "src/shared/core/DatabaseOperation.error";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) { }

  async save(user: Prisma.UsersCreateInput): Promise<
    Prisma.UsersGetPayload<{
      select: {
        id: true;
        email: true;
        createdAt: true;
        updatedAt: true;
      };
    }>
  > {
    const exists = await this.exists(user.email);

    if (!exists) {
      try {
        return this.prisma.users.create({
          data: user,
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (error) {
        throw new DatabaseOperationError("Failed to create user", {
          cause: error,
        });
      }
    } else {
      try {
        return this.prisma.users.update({
          where: { email: user.email },
          data: user,
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (error) {
        throw new DatabaseOperationError("Failed to update user", {
          cause: error,
        });
      }
    }
  }

  async exists(email: string): Promise<boolean> {
    try {
      const exists = await this.findByEmail(email);
      return exists !== null;
    } catch (error) {
      throw new DatabaseOperationError("Failed to check if user exists", {
        cause: error,
      });
    }
  }

  async findById(id: string): Promise<Prisma.UsersGetPayload<{
    select: {
      id: true;
      email: true;
      password: true;
      refreshToken: true;
    };
  }> | null> {
    try {
      return this.prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          password: true,
          refreshToken: true,
        },
      });
    } catch (error) {
      throw new DatabaseOperationError("Failed to find user by id", {
        cause: error,
      });
    }
  }

  async findByEmail(email: string): Promise<Prisma.UsersGetPayload<{
    select: {
      id: true;
      email: true;
      password: true;
      refreshToken: true;
    };
  }> | null> {
    try {
      return this.prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          refreshToken: true,
        },
      });
    } catch (error) {
      throw new DatabaseOperationError("Failed to find user by email", {
        cause: error,
      });
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { refreshToken },
      });
    } catch (error) {
      throw new DatabaseOperationError("Failed to update refresh token", {
        cause: error,
      });
    }
  }

  async deleteByEmail(email: string): Promise<void> {
    try {
      await this.prisma.users.delete({
        where: { email },
      });
    } catch (error) {
      throw new DatabaseOperationError("Failed to delete user by email", {
        cause: error,
      });
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.users.delete({
        where: { id },
      });
    } catch (error) {
      throw new DatabaseOperationError("Failed to delete user by id", {
        cause: error,
      });
    }
  }
}
