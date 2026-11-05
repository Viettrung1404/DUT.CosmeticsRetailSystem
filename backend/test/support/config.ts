import { ConfigService } from '@nestjs/config';

/** Immutable unit-test configuration: developer process.env cannot override fixtures. */
export function configFixture(values: Record<string, unknown>): ConfigService {
  const config = new ConfigService();
  jest.spyOn(config, 'get').mockImplementation((key, fallback) => values[String(key)] ?? fallback);
  return config;
}
