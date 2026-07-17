import { MemoryCacheService } from './memory-cache.service';

describe('MemoryCacheService', () => {
  let cache: MemoryCacheService;

  beforeEach(() => {
    cache = new MemoryCacheService();
  });

  it('trả undefined khi chưa có key', () => {
    expect(cache.get('khong-ton-tai')).toBeUndefined();
  });

  it('set rồi get trả đúng giá trị trong TTL', () => {
    cache.set('key1', { a: 1 }, 10_000);
    expect(cache.get('key1')).toEqual({ a: 1 });
  });

  it('hết TTL thì trả undefined và tự xóa key', async () => {
    cache.set('key1', 'value', 20);
    await new Promise((r) => setTimeout(r, 30));
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('invalidatePrefix chỉ xóa key khớp prefix', () => {
    cache.set('government:findAll:{}', 'a', 10_000);
    cache.set('government:findOne:1', 'b', 10_000);
    cache.set('legal:findAll:{}', 'c', 10_000);

    cache.invalidatePrefix('government:');

    expect(cache.get('government:findAll:{}')).toBeUndefined();
    expect(cache.get('government:findOne:1')).toBeUndefined();
    expect(cache.get('legal:findAll:{}')).toBe('c'); // không bị ảnh hưởng
  });
});
