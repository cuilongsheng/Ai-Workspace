import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

//对应前面的 JwtStrategy 里的 PassportStrategy(Strategy, 'jwt') 两边的名字必须相同 ‘jwt’, Guard 本身不解析 Token，它负责触发名为 jwt 的 Strategy。
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
