import { Injectable } from '@rapidojs/core';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
}

@Injectable()
export class UserService {
  private users: User[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password456',
      createdAt: new Date('2024-01-02'),
    },
  ];

  findAll(query: GetUsersQueryDto): User[] {
    let users = [...this.users];

    if (query.sortBy) {
      users.sort((a, b) => {
        const fieldA = a[query.sortBy as keyof User];
        const fieldB = b[query.sortBy as keyof User];

        if (fieldA === undefined || fieldB === undefined) return 0;

        if (fieldA < fieldB) {
          return query.order === 'asc' ? -1 : 1;
        }
        if (fieldA > fieldB) {
          return query.order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    if (query.page && query.limit) {
      const startIndex = (query.page - 1) * query.limit;
      const endIndex = query.page * query.limit;
      users = users.slice(startIndex, endIndex);
    }

    return users;
  }

  async findById(id: number) {
    return this.users.find(u => u.id === id);
  }

  async findByEmail(email: string) {
    return this.users.find(u => u.email === email);
  }

  async create(createUserDto: CreateUserDto) {
    const newUser: User = {
      id: Math.max(...this.users.map(u => u.id), 0) + 1,
      ...createUserDto,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  update(id: number, userData: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
    };

    return this.users[userIndex];
  }

  delete(id: number): boolean {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return false;
    }

    this.users.splice(userIndex, 1);
    return true;
  }
}
