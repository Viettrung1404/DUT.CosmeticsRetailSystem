import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class OAuthClientDto {
  @ApiProperty({
    minLength: 32,
    maxLength: 128,
    description: 'Client-generated random binding secret; retain for this onboarding flow only',
  })
  @IsString()
  @Length(32, 128)
  clientNonce: string;
}
export class GoogleOAuthDto extends OAuthClientDto {
  @ApiProperty() @IsString() @Length(20, 16384) idToken: string;
}
export class FacebookOAuthDto extends OAuthClientDto {
  @ApiProperty({
    description: 'Classic Facebook user access token; Limited Login JWT is not supported',
  })
  @IsString()
  @Length(20, 16384)
  accessToken: string;
}
export class OAuthChallengeDto extends OAuthClientDto {
  @ApiProperty() @IsString() @Length(64, 64) challenge: string;
}
export class OAuthEmailDto extends OAuthChallengeDto {
  @ApiProperty() @IsEmail() @MaxLength(255) email: string;
}
export class OAuthCompleteDto extends OAuthChallengeDto {
  @ApiProperty({
    description: 'One-time token delivered by email; expires with challenge in 10 minutes',
  })
  @IsString()
  @Length(64, 64)
  verificationToken: string;
}
