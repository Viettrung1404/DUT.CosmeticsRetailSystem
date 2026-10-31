import { PrismaOrderRepository } from '../prisma-order.repository';
describe('Customer order search filters', () => {
  it('keeps customer ownership on both search results and total, with the same local year bounds', async () => {
    const db = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new PrismaOrderRepository(db as never);
    await repository.findCustomerOrders('customer-1', {
      page: 2,
      limit: 10,
      status: 'COMPLETED',
      search: ' Son ',
      year: 2026,
    });
    const query = db.order.findMany.mock.calls[0][0];
    expect(query.where).toEqual({
      customerId: 'customer-1',
      status: 'COMPLETED',
      OR: [
        { orderNumber: { contains: 'Son', mode: 'insensitive' } },
        {
          items: {
            some: { productName: { contains: 'Son', mode: 'insensitive' } },
          },
        },
      ],
      createdAt: {
        gte: new Date('2026-01-01T00:00:00+07:00'),
        lt: new Date('2027-01-01T00:00:00+07:00'),
      },
    });
    expect(query.skip).toBe(10);
    expect(db.order.count).toHaveBeenCalledWith({ where: query.where });
  });
});
