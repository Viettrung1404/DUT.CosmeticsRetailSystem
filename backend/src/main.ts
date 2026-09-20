import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@core/filters/http-exception.filter';
import { TransformResponseInterceptor } from '@core/interceptors/transform-response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cấu hình CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Prefix: /api/v1
  const globalPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Cấu hình Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('GlowUp Cosmetics Retail System API')
    .setDescription(
      'Hệ thống quản lý bán hàng và phân tích kinh doanh chuỗi bán lẻ mỹ phẩm GlowUp - Clean Architecture (NestJS + Prisma + Neon PostgreSQL 17)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Customer - Products (Việt Trung)', 'API phục vụ Website / Mobile cho khách hàng')
    .addTag('Admin - Products (Thành Lập)', 'API phục vụ Dashboard quản trị cho Admin & Nhân viên')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Ứng dụng GlowUp Backend đang chạy tại: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📚 Swagger API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
