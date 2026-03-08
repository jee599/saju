import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──
const {
  mockPrisma,
  mockGenerateFreePersonality,
  mockGenerateChunkedReport,
} = vi.hoisted(() => ({
  mockPrisma: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    report: { findFirst: vi.fn(), create: vi.fn() },
  },
  mockGenerateFreePersonality: vi.fn(),
  mockGenerateChunkedReport: vi.fn(),
}));

vi.mock('@saju/api/db', () => ({ prisma: mockPrisma }));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../../lib/viewToken', () => ({
  generateViewToken: (id: string) => `token_${id}`,
  verifyViewToken: (id: string, token: string) => token === `token_${id}`,
}));

vi.mock('../../lib/reportLength', () => ({
  countReportChars: (text: string) => text.length,
}));

vi.mock('../../lib/sendReportEmail', () => ({
  sendReportEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../lib/llmEngine', () => ({
  generateFreePersonality: (...args: any[]) => mockGenerateFreePersonality(...args),
  generateChunkedReport: (...args: any[]) => mockGenerateChunkedReport(...args),
  getPersonalityDef: () => ({ key: 'personality', title: '성격' }),
  getReportTexts: (_locale: string, name: string) => ({
    headline: `${name}의 사주 분석`,
    summary: '요약',
    disclaimer: '면책조항',
  }),
  convertLunarInputToSolar: (input: any) => input,
}));

vi.mock('../../lib/mockEngine', () => ({
  generatePreview: () => ({
    headline: '미리보기',
    sections: [{ key: 'preview', title: '미리보기', text: '내용' }],
  }),
  isValidFortuneInput: (input: any) =>
    !!(input?.name && input?.birthDate && input?.gender && input?.calendarType),
}));

import { POST as reportGenerate } from '../../app/api/report/generate/route';
import { POST as reportPreview } from '../../app/api/report/preview/route';
import { GET as reportGet } from '../../app/api/report/[orderId]/route';

function makeRequest(body: unknown, url = 'http://localhost:3000/api/report/generate'): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(orderId: string, token?: string): Request {
  const url = `http://localhost:3000/api/report/${orderId}${token ? `?token=${token}` : ''}`;
  return new Request(url, { method: 'GET' });
}

const VALID_INPUT = {
  name: '홍길동',
  birthDate: '1990-01-15',
  birthTime: '14:30',
  gender: 'male',
  calendarType: 'solar',
};

describe('POST /api/report/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid type', async () => {
    const res = await reportGenerate(makeRequest({ type: 'invalid' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_TYPE');
  });

  // ── Free report ──

  it('returns 400 for free report with missing input', async () => {
    const res = await reportGenerate(makeRequest({ type: 'free', input: {} }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('generates free personality report', async () => {
    mockGenerateFreePersonality.mockResolvedValue({
      section: { key: 'personality', title: '성격', text: '당신의 성격 분석입니다.' },
    });

    const res = await reportGenerate(
      makeRequest({ type: 'free', input: VALID_INPUT, locale: 'ko' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.type).toBe('free');
    expect(json.data.section.key).toBe('personality');
  });

  // ── Paid report ──

  it('returns 400 for paid report without orderId', async () => {
    const res = await reportGenerate(makeRequest({ type: 'paid' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 404 for non-existent order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    const res = await reportGenerate(
      makeRequest({ type: 'paid', orderId: 'nonexistent' })
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('returns 404 for unconfirmed order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'created',
      request: { name: '홍길동', birthDate: '1990-01-15', gender: 'male', calendarType: 'solar' },
    });

    const res = await reportGenerate(
      makeRequest({ type: 'paid', orderId: 'ord_123' })
    );
    const json = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns cached report if already generated', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'confirmed',
      locale: 'ko',
      request: VALID_INPUT,
    });

    mockPrisma.report.findFirst.mockResolvedValue({
      id: 'rep_123',
      orderId: 'ord_123',
      productCode: 'full',
      generatedAt: new Date('2026-01-01'),
      headline: '캐시된 제목',
      summary: '캐시된 요약',
      sectionsJson: JSON.stringify([{ key: 'personality', title: '성격', text: '내용' }]),
      recommendationsJson: JSON.stringify(['추천1']),
      disclaimer: '면책조항',
    });

    const res = await reportGenerate(
      makeRequest({ type: 'paid', orderId: 'ord_123' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.cached).toBe(true);
    expect(json.data.report.headline).toBe('캐시된 제목');
    expect(mockGenerateChunkedReport).not.toHaveBeenCalled();
  });

  it('generates new paid report when no cache exists', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_456',
      status: 'confirmed',
      locale: 'ko',
      productCode: 'full',
      email: null,
      request: {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: '14:30',
        gender: 'male',
        calendarType: 'solar',
      },
    });

    mockPrisma.report.findFirst.mockResolvedValue(null);

    mockGenerateFreePersonality.mockResolvedValue({
      section: { key: 'personality', title: '성격', text: '성격 분석 텍스트' },
    });

    mockGenerateChunkedReport.mockResolvedValue({
      sections: [
        { key: 'career', title: '직업', text: '직업 분석' },
        { key: 'love', title: '연애', text: '연애 분석' },
      ],
      headline: '생성된 제목',
      recommendations: ['추천1', '추천2'],
      disclaimer: '면책조항',
    });

    mockPrisma.report.create.mockResolvedValue({ id: 'rep_456' });

    const res = await reportGenerate(
      makeRequest({ type: 'paid', orderId: 'ord_456' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.cached).toBe(false);
    expect(json.data.report.sections).toHaveLength(3);
    expect(mockPrisma.report.create).toHaveBeenCalledOnce();
  });

  it('handles P2002 unique violation (concurrent generation)', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_789',
      status: 'confirmed',
      locale: 'ko',
      productCode: 'full',
      email: null,
      request: {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: null,
        gender: 'male',
        calendarType: 'solar',
      },
    });

    // First findFirst: no cache
    mockPrisma.report.findFirst.mockResolvedValueOnce(null);

    mockGenerateFreePersonality.mockResolvedValue({
      section: { key: 'personality', title: '성격', text: '성격 분석' },
    });
    mockGenerateChunkedReport.mockResolvedValue({
      sections: [{ key: 'career', title: '직업', text: '직업' }],
      headline: '제목',
      recommendations: [],
      disclaimer: '면책',
    });

    // Simulate P2002 unique constraint violation
    const p2002Error = new Error('Unique constraint failed') as any;
    p2002Error.code = 'P2002';
    mockPrisma.report.create.mockRejectedValue(p2002Error);

    // Second findFirst (after P2002): return the winner's report
    mockPrisma.report.findFirst.mockResolvedValueOnce({
      id: 'rep_winner',
      orderId: 'ord_789',
      productCode: 'full',
      generatedAt: new Date(),
      headline: '승자의 제목',
      summary: '요약',
      sectionsJson: JSON.stringify([{ key: 'personality', title: '성격', text: '내용' }]),
      recommendationsJson: JSON.stringify([]),
      disclaimer: '면책',
    });

    const res = await reportGenerate(
      makeRequest({ type: 'paid', orderId: 'ord_789' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.cached).toBe(true);
    expect(json.data.report.headline).toBe('승자의 제목');
  });

  it('re-throws non-P2002 DB errors as unhandled rejection', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_err',
      status: 'confirmed',
      locale: 'ko',
      productCode: 'full',
      email: null,
      request: {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: null,
        gender: 'male',
        calendarType: 'solar',
      },
    });

    mockPrisma.report.findFirst.mockResolvedValue(null);
    mockGenerateFreePersonality.mockResolvedValue({
      section: { key: 'personality', title: '성격', text: '분석' },
    });
    mockGenerateChunkedReport.mockResolvedValue({
      sections: [],
      headline: '제목',
      recommendations: [],
      disclaimer: '면책',
    });

    mockPrisma.report.create.mockRejectedValue(new Error('Connection lost'));

    // Non-P2002 errors are re-thrown from handlePaidReport; the outer
    // try/catch in POST doesn't await handlePaidReport so it surfaces
    // as an unhandled rejection (Next.js runtime catches these in prod).
    await expect(
      reportGenerate(makeRequest({ type: 'paid', orderId: 'ord_err' }))
    ).rejects.toThrow('Connection lost');
  });
});

describe('POST /api/report/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid input', async () => {
    const res = await reportPreview(
      makeRequest({}, 'http://localhost:3000/api/report/preview')
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns preview for valid input', async () => {
    const res = await reportPreview(
      makeRequest(VALID_INPUT, 'http://localhost:3000/api/report/preview')
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.headline).toBe('미리보기');
  });
});

describe('GET /api/report/[orderId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for short orderId', async () => {
    const res = await reportGet(
      makeGetRequest('abc'),
      { params: Promise.resolve({ orderId: 'abc' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_ORDER');
  });

  it('returns 403 for missing token', async () => {
    const res = await reportGet(
      makeGetRequest('ord_12345678'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for invalid token', async () => {
    const res = await reportGet(
      makeGetRequest('ord_12345678', 'wrong_token'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    const res = await reportGet(
      makeGetRequest('ord_12345678', 'token_ord_12345678'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('returns 404 for unconfirmed order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_12345678',
      status: 'created',
      request: VALID_INPUT,
      reports: [],
    });

    const res = await reportGet(
      makeGetRequest('ord_12345678', 'token_ord_12345678'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns order and report for confirmed order with report', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_12345678',
      status: 'confirmed',
      productCode: 'full',
      amountKrw: 19900,
      createdAt: new Date('2026-01-01'),
      confirmedAt: new Date('2026-01-01'),
      request: {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: '14:30',
        gender: 'male',
        calendarType: 'solar',
      },
      reports: [
        {
          id: 'rep_001',
          productCode: 'full',
          generatedAt: new Date('2026-01-01'),
          headline: '제목',
          summary: '요약',
          sectionsJson: JSON.stringify([{ key: 'personality', title: '성격', text: '내용' }]),
          recommendationsJson: JSON.stringify(['추천1']),
          disclaimer: '면책조항',
        },
      ],
    });

    const res = await reportGet(
      makeGetRequest('ord_12345678', 'token_ord_12345678'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.order.orderId).toBe('ord_12345678');
    expect(json.data.report).not.toBeNull();
    expect(json.data.report.headline).toBe('제목');
    expect(json.data.input.name).toBe('홍길동');
  });

  it('returns null report when no report generated yet', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_12345678',
      status: 'confirmed',
      productCode: 'full',
      amountKrw: 19900,
      createdAt: new Date('2026-01-01'),
      confirmedAt: new Date('2026-01-01'),
      request: {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: null,
        gender: 'male',
        calendarType: 'solar',
      },
      reports: [],
    });

    const res = await reportGet(
      makeGetRequest('ord_12345678', 'token_ord_12345678'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.report).toBeNull();
  });

  it('sets cache headers on response', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_12345678',
      status: 'confirmed',
      productCode: 'full',
      amountKrw: 19900,
      createdAt: new Date('2026-01-01'),
      confirmedAt: null,
      request: VALID_INPUT,
      reports: [],
    });

    const res = await reportGet(
      makeGetRequest('ord_12345678', 'token_ord_12345678'),
      { params: Promise.resolve({ orderId: 'ord_12345678' }) }
    );

    expect(res.headers.get('Cache-Control')).toContain('private');
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600');
  });
});
