import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (vi.mock factories are hoisted above imports) ──
const { mockPrisma, mockPaddleTransactions } = vi.hoisted(() => ({
  mockPrisma: {
    fortuneRequest: { create: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
  mockPaddleTransactions: { get: vi.fn() },
}));

vi.mock('@saju/api/db', () => ({ prisma: mockPrisma }));

vi.mock('../../lib/paddle', () => ({
  getPaddle: () => ({ transactions: mockPaddleTransactions }),
}));

vi.mock('@saju/shared', () => ({
  isValidFortuneInput: (input: any) =>
    !!(input?.name && input?.birthDate && input?.gender && input?.calendarType),
  getCountryByLocale: () => ({
    code: 'KR',
    currency: 'KRW',
    paymentProvider: 'toss',
    pricing: { saju: { premium: 19900 } },
  }),
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST as checkoutCreate } from '../../app/api/checkout/create/route';
import { POST as checkoutConfirm } from '../../app/api/checkout/confirm/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/checkout/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_INPUT = {
  name: '홍길동',
  birthDate: '1990-01-15',
  birthTime: '14:30',
  gender: 'male',
  calendarType: 'solar',
};

describe('POST /api/checkout/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing input', async () => {
    const res = await checkoutCreate(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 for invalid productCode', async () => {
    const res = await checkoutCreate(
      makeRequest({ input: VALID_INPUT, productCode: 'invalid' })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it('returns 400 for empty name', async () => {
    const res = await checkoutCreate(
      makeRequest({ input: { ...VALID_INPUT, name: '' }, productCode: 'full' })
    );
    expect(res.status).toBe(400);
  });

  it('creates order successfully with valid input', async () => {
    mockPrisma.fortuneRequest.create.mockResolvedValue({
      id: 'fr_123',
      name: '홍길동',
    });
    mockPrisma.order.create.mockResolvedValue({
      id: 'ord_123',
      productCode: 'full',
      amountKrw: 19900,
      status: 'created',
      createdAt: new Date('2026-01-01'),
    });

    const res = await checkoutCreate(
      makeRequest({ input: VALID_INPUT, productCode: 'full' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.order.orderId).toBe('ord_123');
    expect(json.data.order.status).toBe('created');
    expect(mockPrisma.fortuneRequest.create).toHaveBeenCalledOnce();
    expect(mockPrisma.order.create).toHaveBeenCalledOnce();
  });

  it('returns 500 when DB throws', async () => {
    mockPrisma.fortuneRequest.create.mockRejectedValue(new Error('DB down'));

    const res = await checkoutCreate(
      makeRequest({ input: VALID_INPUT, productCode: 'full' })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  it('passes locale through to order creation', async () => {
    mockPrisma.fortuneRequest.create.mockResolvedValue({ id: 'fr_456' });
    mockPrisma.order.create.mockResolvedValue({
      id: 'ord_456',
      productCode: 'full',
      amountKrw: 19900,
      status: 'created',
      createdAt: new Date(),
    });

    await checkoutCreate(
      makeRequest({ input: VALID_INPUT, productCode: 'full', locale: 'ja' })
    );

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ locale: 'ja' }),
      })
    );
  });
});

describe('POST /api/checkout/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await checkoutConfirm(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 404 when order not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    const res = await checkoutConfirm(makeRequest({ orderId: 'nonexistent' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('returns success for already confirmed order (idempotent)', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'confirmed',
      paymentProvider: 'paddle',
    });

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.orderId).toBe('ord_123');
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('returns 409 for paddle order without paymentId', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'created',
      paymentProvider: 'paddle',
      paymentId: null,
    });

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('PAYMENT_PENDING');
  });

  it('returns 402 when Paddle transaction is not paid', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'created',
      paymentProvider: 'paddle',
      paymentId: 'txn_abc',
    });
    mockPaddleTransactions.get.mockResolvedValue({ status: 'pending' });

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.error.code).toBe('PAYMENT_NOT_PAID');
  });

  it('confirms paddle order when transaction is paid', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'created',
      paymentProvider: 'paddle',
      paymentId: 'txn_abc',
    });
    mockPaddleTransactions.get.mockResolvedValue({ status: 'paid' });
    mockPrisma.order.update.mockResolvedValue({ id: 'ord_123', status: 'confirmed' });

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord_123' },
        data: expect.objectContaining({ status: 'confirmed' }),
      })
    );
  });

  it('confirms paddle order when transaction is completed', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'created',
      paymentProvider: 'paddle',
      paymentId: 'txn_abc',
    });
    mockPaddleTransactions.get.mockResolvedValue({ status: 'completed' });
    mockPrisma.order.update.mockResolvedValue({ id: 'ord_123', status: 'confirmed' });

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('blocks non-paddle confirm in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord_123',
      status: 'created',
      paymentProvider: 'toss',
      paymentId: null,
    });

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('PAYMENT_VERIFICATION_REQUIRED');

    process.env.NODE_ENV = origEnv;
  });

  it('returns 500 when DB throws during confirm', async () => {
    mockPrisma.order.findUnique.mockRejectedValue(new Error('DB error'));

    const res = await checkoutConfirm(makeRequest({ orderId: 'ord_123' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});
