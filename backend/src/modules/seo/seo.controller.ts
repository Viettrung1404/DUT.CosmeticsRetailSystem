import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { Public } from '@core/decorators/public.decorator';
import { RawResponse } from '@core/decorators/raw-response.decorator';
import { SeoService } from './seo.service';

@Public()
@RawResponse()
@ApiTags('SEO')
@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}
  private send(body: string, type: string, req: Request, res: Response) {
    const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
    res.set({
      'Content-Type': `${type}; charset=utf-8`,
      'Cache-Control': 'public, no-cache',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    });
    if (
      req.headers['if-none-match']
        ?.split(',')
        .map((x) => x.trim().replace(/^W\//, ''))
        .includes(etag)
    )
      return res.status(304).end();
    return res.send(body);
  }
  @Get('sitemap.xml')
  @ApiProduces('application/xml')
  @ApiOperation({
    summary: 'Sitemap index; proxy this and /sitemaps/* at the website origin',
  })
  @ApiOkResponse({
    schema: { type: 'string' },
    description: 'Raw XML sitemap index',
  })
  async index(@Req() req: Request, @Res() res: Response) {
    return this.send(await this.seo.index(), 'application/xml', req, res);
  }
  @Get('sitemaps/:source/:page.xml')
  @ApiProduces('application/xml')
  @ApiOkResponse({
    schema: { type: 'string' },
    description: 'Raw XML; at most 1000 URLs',
  })
  async part(
    @Param('source') source: string,
    @Param('page') page: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.send(
      await this.seo.sitemap(source, /^\d+$/.test(page) ? Number(page) : NaN),
      'application/xml',
      req,
      res,
    );
  }
  @Get('robots.txt')
  @ApiProduces('text/plain')
  @ApiOkResponse({
    schema: { type: 'string' },
    description: 'Raw robots.txt for website root',
  })
  robots(@Req() req: Request, @Res() res: Response) {
    return this.send(this.seo.robots(), 'text/plain', req, res);
  }
}
