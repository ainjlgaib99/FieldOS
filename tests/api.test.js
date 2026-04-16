import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── AT.cached ─────────────────────────────────────────────────────────────────
//
// The caching logic is isolated here as a factory so each test gets a fresh
// store.  The implementation is a direct copy of AT.cached / AT.bust from
// index.html — any change there must be mirrored here.

function makeCacheStore() {
  const _c = {};
  return {
    async cached(k, fn, ttl = 60000) {
      const now = Date.now();
      if (_c[k] && now - _c[k].t < ttl) return _c[k].v;
      const v = await fn();
      _c[k] = { v, t: now };
      return v;
    },
    bust(k) { delete _c[k]; },
    /** Expose internals so tests can inspect cache state directly. */
    _c,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AT.cached', () => {
  it('calls fn and returns its value on first access', async () => {
    const store = makeCacheStore();
    const fn = vi.fn().mockResolvedValue([1, 2, 3]);

    const result = await store.cached('k', fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns cached value without calling fn again within TTL', async () => {
    const store = makeCacheStore();
    const fn = vi.fn().mockResolvedValue('data');

    await store.cached('k', fn);
    const second = await store.cached('k', fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(second).toBe('data');
  });

  it('re-fetches after TTL has expired', async () => {
    const store = makeCacheStore();
    let t = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => t);

    const fn = vi.fn().mockResolvedValue('fresh');
    t = 0;   await store.cached('k', fn, 500);
    t = 501; await store.cached('k', fn, 500); // 1 ms past TTL

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-fetch when still inside TTL boundary', async () => {
    const store = makeCacheStore();
    let t = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => t);

    const fn = vi.fn().mockResolvedValue('data');
    t = 0;   await store.cached('k', fn, 500);
    t = 499; await store.cached('k', fn, 500); // 1 ms before expiry

    expect(fn).toHaveBeenCalledOnce();
  });

  it('bust() removes the entry so the next call re-fetches', async () => {
    const store = makeCacheStore();
    const fn = vi.fn().mockResolvedValue('v');

    await store.cached('k', fn);
    store.bust('k');
    await store.cached('k', fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('bust() only removes the targeted key, leaving others intact', async () => {
    const store = makeCacheStore();
    const fn = vi.fn().mockResolvedValue('v');

    await store.cached('a', fn);
    await store.cached('b', fn);
    store.bust('a');

    expect(store._c['a']).toBeUndefined();
    expect(store._c['b']).toBeDefined();
  });

  it('caches different keys independently', async () => {
    const store = makeCacheStore();
    const fn1 = vi.fn().mockResolvedValue('v1');
    const fn2 = vi.fn().mockResolvedValue('v2');

    const r1 = await store.cached('k1', fn1);
    const r2 = await store.cached('k2', fn2);

    expect(r1).toBe('v1');
    expect(r2).toBe('v2');
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('uses the default 60 000 ms TTL when none is supplied', async () => {
    const store = makeCacheStore();
    let t = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => t);

    const fn = vi.fn().mockResolvedValue('data');
    t = 0;      await store.cached('k', fn);       // prime
    t = 59_999; await store.cached('k', fn);       // still valid
    t = 60_001; await store.cached('k', fn);       // expired

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ── AT.list pagination ────────────────────────────────────────────────────────
//
// The pagination loop is isolated as a factory that accepts a fetch stub so
// network calls can be controlled without any globals.  Implementation is a
// direct copy of AT.list from index.html (minus token/headers, which don't
// affect pagination correctness).

function makeListFn(fetchStub) {
  return async function list(tableId, params = {}) {
    const rows = [];
    let offset;
    do {
      const p = { ...params };
      if (offset) p.offset = offset;
      const url = `https://api.airtable.com/v0/BASE/${tableId}`;
      const r = await fetchStub(url, p);
      if (!r.ok) throw new Error(`AT ${r.status}`);
      const d = await r.json();
      rows.push(...d.records);
      offset = d.offset;
    } while (offset);
    return rows;
  };
}

describe('AT.list pagination', () => {
  it('returns all records from a single page', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ records: [{ id: 'r1' }, { id: 'r2' }] }),
    });

    const list = makeListFn(fetchStub);
    const result = await list('tbl123');

    expect(result).toHaveLength(2);
    expect(fetchStub).toHaveBeenCalledOnce();
  });

  it('follows the offset token to fetch all pages', async () => {
    let call = 0;
    const fetchStub = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ records: [{ id: 'r1' }], offset: 'page2' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ records: [{ id: 'r2' }, { id: 'r3' }] }),
      });
    });

    const list = makeListFn(fetchStub);
    const result = await list('tbl123');

    expect(result).toHaveLength(3);
    expect(result.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('handles three or more pages correctly', async () => {
    let call = 0;
    const pages = [
      { records: [{ id: 'r1' }], offset: 'p2' },
      { records: [{ id: 'r2' }], offset: 'p3' },
      { records: [{ id: 'r3' }] },
    ];
    const fetchStub = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(pages[call++]) })
    );

    const list = makeListFn(fetchStub);
    const result = await list('tbl123');

    expect(result).toHaveLength(3);
    expect(fetchStub).toHaveBeenCalledTimes(3);
  });

  it('stops paginating when offset is absent from the response', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      // No `offset` field — loop should terminate after the first request
      json: () => Promise.resolve({ records: [{ id: 'r1' }] }),
    });

    const list = makeListFn(fetchStub);
    await list('tbl123');

    expect(fetchStub).toHaveBeenCalledOnce();
  });

  it('treats an empty-string offset as falsy (loop terminator)', async () => {
    // Airtable omits offset on the last page, but guard against "" just in case
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ records: [{ id: 'r1' }], offset: '' }),
    });

    const list = makeListFn(fetchStub);
    await list('tbl123');

    expect(fetchStub).toHaveBeenCalledOnce();
  });

  it('returns an empty array when Airtable returns no records', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ records: [] }),
    });

    const list = makeListFn(fetchStub);
    const result = await list('tbl123');

    expect(result).toEqual([]);
  });

  it('throws with status code on a non-ok response', async () => {
    const fetchStub = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const list = makeListFn(fetchStub);

    await expect(list('tbl123')).rejects.toThrow('AT 401');
  });

  it('throws on a 422 Unprocessable Entity (bad formula)', async () => {
    const fetchStub = vi.fn().mockResolvedValue({ ok: false, status: 422 });

    const list = makeListFn(fetchStub);

    await expect(list('tbl123')).rejects.toThrow('AT 422');
  });
});
