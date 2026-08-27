// DTO 负责验证 HTTP 输入格式是否合法，不负责业务认证
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username or email address' })
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
