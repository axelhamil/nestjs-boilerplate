import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { CreateUserDto } from "./dtos/CreateUser.dto";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository,
  ) { }

  async createUser(user: CreateUserDto) {
    const userExists = await this.usersRepository.findByEmail(user.email);
    if (userExists)
      throw new ConflictException("Email already exists");

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    return this.usersRepository.updateRefreshToken(userId, refreshToken);
  }
}