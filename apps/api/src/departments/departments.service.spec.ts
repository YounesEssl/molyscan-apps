import { PrismaService } from '../prisma/prisma.service';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService', () => {
  const findMany = jest.fn();
  const service = new DepartmentsService({
    department: { findMany },
  } as unknown as PrismaService);

  beforeEach(() => findMany.mockReset());

  it('hides email opt-out markers from the public registration list', async () => {
    findMany.mockResolvedValue([]);

    await service.listPublic();

    expect(findMany).toHaveBeenCalledWith({
      where: { emailNotificationsDisabled: false },
      orderBy: { code: 'asc' },
    });
  });

  it('keeps email opt-out markers in the admin assignment list', async () => {
    findMany.mockResolvedValue([]);

    await service.listAll();

    expect(findMany).toHaveBeenCalledWith({ orderBy: { code: 'asc' } });
  });
});
