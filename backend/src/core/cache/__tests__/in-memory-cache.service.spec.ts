import { InMemoryCacheService } from '../in-memory-cache.service';

describe('InMemoryCacheService', () => {
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    cacheService = new InMemoryCacheService();
  });

  afterEach(() => {
    cacheService.onModuleDestroy();
  });

  it('lưu và lấy giá trị thành công', async () => {
    await cacheService.set('key1', { message: 'hello' }, 5000);
    const value = await cacheService.get<{ message: string }>('key1');
    expect(value).toEqual({ message: 'hello' });
  });

  it('trả về null nếu key không tồn tại', async () => {
    const value = await cacheService.get('non_existent');
    expect(value).toBeNull();
  });

  it('trả về null khi key đã hết hạn (TTL expired)', async () => {
    // TTL âm hoặc 0ms để hết hạn ngay lập tức
    await cacheService.set('expired_key', 'expired_value', -100);
    const value = await cacheService.get('expired_key');
    expect(value).toBeNull();
  });

  it('xóa key thành công (del)', async () => {
    await cacheService.set('del_key', 'value', 5000);
    await cacheService.del('del_key');
    const value = await cacheService.get('del_key');
    expect(value).toBeNull();
  });

  it('reset cache thành công', async () => {
    await cacheService.set('key1', 'val1');
    await cacheService.set('key2', 'val2');
    await cacheService.reset();
    expect(await cacheService.get('key1')).toBeNull();
    expect(await cacheService.get('key2')).toBeNull();
  });
});
