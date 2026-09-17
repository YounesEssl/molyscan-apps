import { UserRole, WorkflowStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { WorkflowsService } from '../workflows.service';

describe('WorkflowsService email notifications', () => {
  it('keeps Divers recipients in-app but excludes them from email', async () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    const recipients = [
      {
        id: 'commercial-email',
        email: 'email@molydal.com',
        departments: [{ emailNotificationsDisabled: false }],
      },
      {
        id: 'commercial-divers',
        email: 'divers@molydal.com',
        departments: [
          { emailNotificationsDisabled: false },
          { emailNotificationsDisabled: true },
        ],
      },
    ];

    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'distributor',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean@example.com',
          departments: [{ id: 'department-75', name: 'Paris' }],
        }),
        findMany: jest.fn().mockResolvedValue(recipients),
      },
      priceWorkflow: {
        create: jest.fn().mockResolvedValue({
          id: 'workflow-1',
          scanId: 'scan-1',
          productName: 'Produit Molydal',
          molydalRef: null,
          molydalProduct: null,
          clientName: null,
          quantity: null,
          unit: 'L',
          requestedPrice: null,
          approvedPrice: null,
          status: WorkflowStatus.submitted,
          steps: [
            {
              status: WorkflowStatus.draft,
              actor: 'Jean Dupont',
              date: now,
              comment: null,
            },
            {
              status: WorkflowStatus.submitted,
              actor: 'Jean Dupont',
              date: now,
              comment: null,
            },
          ],
          createdAt: now,
          updatedAt: now,
        }),
      },
    };
    const notifications = { create: jest.fn().mockResolvedValue(undefined) };
    const email = {
      sendPriceRequestToCommercials: jest.fn().mockResolvedValue(undefined),
    };

    const service = new WorkflowsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      email as unknown as EmailService,
    );

    await service.create('distributor', UserRole.distributor, {
      scanId: 'scan-1',
      productName: 'Produit Molydal',
    });

    expect(email.sendPriceRequestToCommercials).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: ['email@molydal.com'] }),
    );
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(
      'commercial-divers',
      expect.anything(),
      expect.any(String),
      expect.any(String),
      'workflow-1',
    );
    expect(prisma.priceWorkflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipients: {
            connect: [
              { id: 'commercial-email' },
              { id: 'commercial-divers' },
            ],
          },
        }),
      }),
    );
  });
});
