import { OAuthLoginResponse } from '../dtos/oauth.responses';
import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/decorators/public.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { Request } from 'express';
import { OAuthProviderService } from '../../infrastructure/adapters/oauth-provider.service';
import { OAuthService } from '../../application/oauth.service';
import {
  FacebookOAuthDto,
  GoogleOAuthDto,
  OAuthCompleteDto,
  OAuthEmailDto,
} from '../dtos/oauth.dto';
import { LoginResponseDto } from '../dtos/auth.dto';

@ApiTags('Auth - OAuth')
@ApiExtraModels(LoginResponseDto)
@ApiResponse({
  status: 400,
  description: 'DTO invalid, unsupported fields or email mismatch',
})
@ApiResponse({
  status: 401,
  description: 'Invalid provider token, expired/replayed challenge or invalid verification code',
})
@ApiResponse({
  status: 403,
  description: 'Account inactive, account login required or challenge belongs to another account',
})
@ApiResponse({
  status: 409,
  description: 'Identity already owned by another account or email already sent',
})
@ApiResponse({
  status: 429,
  description: 'Rate limited; Retry-After header contains seconds',
})
@ApiResponse({
  status: 503,
  description: 'Provider, email or distributed rate-limit store unavailable/unconfigured',
})
@Controller('auth/oauth')
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class OAuthController {
  constructor(
    private readonly providers: OAuthProviderService,
    private readonly oauth: OAuthService,
  ) {}
  private client(req: Request) {
    return { ipAddress: req.ip, deviceInfo: req.headers['user-agent'] };
  }
  @Public()
  @Post('google')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Exchange verified Google ID token for a GlowUp session or an onboarding/link challenge',
  })
  @OAuthLoginResponse()
  async google(@Body() input: GoogleOAuthDto, @Req() req: Request) {
    return this.oauth.login(
      await this.providers.google(input.idToken),
      input.clientNonce,
      this.client(req),
    );
  }
  @Public()
  @Post('facebook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange classic Facebook user access token; Limited Login is unsupported',
  })
  @OAuthLoginResponse()
  async facebook(@Body() input: FacebookOAuthDto, @Req() req: Request) {
    return this.oauth.login(
      await this.providers.facebook(input.accessToken),
      input.clientNonce,
      this.client(req),
    );
  }
  @Public()
  @Post('email')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @ApiOperation({
    summary:
      'Send one-time verification code for bound challenge; existing target email cannot be changed',
  })
  async email(@Body() input: OAuthEmailDto) {
    return this.oauth.sendEmail(input);
  }
  @Public()
  @Post('complete')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Create a new verified customer from challenge; existing email requires authenticated /link',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  complete(@Body() input: OAuthCompleteDto, @Req() req: Request) {
    return this.oauth.complete(input, this.client(req));
  }
  @Post('link')
  @HttpCode(200)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Link identity to current account using fresh email proof; never merges accounts or POS history',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  link(@Body() input: OAuthCompleteDto, @Req() req: Request & { user: JwtPayload }) {
    return this.oauth.complete(input, this.client(req), req.user.userId);
  }
}
