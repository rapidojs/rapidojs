import { Body, Controller, Get, Post, UseGuards, CurrentUser } from '@rapidojs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from '@rapidojs/auth';

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
  ) {
    const user = await this.authService.login(loginDto);
    const payload = { email: user.email, sub: user.id };
    const accessToken = await this.authService.signJwt(payload);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
