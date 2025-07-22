import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@rapidojs/core';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';

@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getAllUsers(@Query() query: GetUsersQueryDto) {
    const users = this.userService.findAll(query);
    return {
      success: true,
      data: users,
      message: 'Users retrieved successfully',
      meta: query,
    };
  }

  @Get('/:id')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = this.userService.findById(id);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    const newUser = this.userService.create(createUserDto);
    
    return {
      success: true,
      data: newUser,
      message: 'User created successfully',
    };
  }

  @Put('/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const updatedUser = this.userService.update(id, updateUserDto);
    
    if (!updatedUser) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    };
  }

  @Delete('/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    const deleted = this.userService.delete(id);
    
    if (!deleted) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
