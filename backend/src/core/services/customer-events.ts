import { Prisma } from '@prisma/client';

export async function notifyUser(
  tx: Prisma.TransactionClient,
  userId: string,
  event: string,
  title: string,
  type: string,
  data: Prisma.InputJsonValue = {},
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return;
  const eventKey = `${event}:${userId}`;
  const notification = await tx.notification.upsert({
    where: { eventKey },
    update: {},
    create: {
      userId,
      eventKey,
      title,
      message: title,
      type,
      data,
    },
  });
  await tx.emailOutbox.upsert({
    where: { eventKey },
    update: {},
    create: {
      userId,
      eventKey,
      recipient: user.email,
      subject: title,
      text: title,
    },
  });
  const devices = await tx.userDevice.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });
  if (devices.length)
    await tx.pushDelivery.createMany({
      skipDuplicates: true,
      data: devices.map((device) => ({
        notificationId: notification.id,
        deviceId: device.id,
      })),
    });
}

export async function notifyCustomer(
  tx: Prisma.TransactionClient,
  customerId: string | null,
  event: string,
  title: string,
  type: string,
  data: Prisma.InputJsonValue = {},
) {
  if (!customerId) return;
  const owner = await tx.customer.findUnique({
    where: { id: customerId },
    select: { userId: true },
  });
  if (owner?.userId)
    await notifyUser(tx, owner.userId, event, title, type, data);
}
