import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class MessageFeedbackDto {
  @IsBoolean()
  helpful: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
