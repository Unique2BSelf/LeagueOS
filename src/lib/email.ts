import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type QueueEmailOptions = {
  toEmail: string;
  toName?: string | null;
  subject: string;
  htmlBody: string;
  textBody?: string;
  templateType?: string;
  audienceType?: string;
  sentByUserId?: string | null;
  relatedRegistrationId?: string | null;
  relatedSeasonId?: string | null;
  relatedTeamId?: string | null;
  relatedDivisionId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || 'League OS';

  return {
    host,
    port,
    user,
    pass,
    fromEmail,
    fromName,
    configured: Boolean(host && fromEmail),
  };
}

async function sendWithSmtp(options: QueueEmailOptions) {
  const config = getMailerConfig();
  if (!config.configured) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: options.toName ? `"${options.toName}" <${options.toEmail}>` : options.toEmail,
    subject: options.subject,
    html: options.htmlBody,
    text: options.textBody,
  });
}

export async function queueAndSendEmail(options: QueueEmailOptions) {
  const email = await prisma.outboundEmail.create({
    data: {
      toEmail: options.toEmail,
      toName: options.toName || null,
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody || null,
      templateType: options.templateType || null,
      audienceType: options.audienceType || null,
      sentByUserId: options.sentByUserId || null,
      relatedRegistrationId: options.relatedRegistrationId || null,
      relatedSeasonId: options.relatedSeasonId || null,
      relatedTeamId: options.relatedTeamId || null,
      relatedDivisionId: options.relatedDivisionId || null,
      metadata: (options.metadata || undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  try {
    await sendWithSmtp(options);
    return prisma.outboundEmail.update({
      where: { id: email.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown mail error';
    const status = message === 'SMTP_NOT_CONFIGURED' ? 'SKIPPED' : 'FAILED';

    console.error('Email delivery error:', message, options.subject, options.toEmail);

    return prisma.outboundEmail.update({
      where: { id: email.id },
      data: {
        status,
        errorMessage: message,
      },
    });
  }
}

export function renderPaymentReceiptEmail(input: {
  playerName: string;
  seasonName: string;
  amount: number;
  paidAt: Date;
  registrationId: string;
  thankYouSubject?: string | null;
  thankYouBody?: string | null;
}) {
  const paidDate = input.paidAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const subject = input.thankYouSubject?.trim() || `Registration receipt for ${input.seasonName}`;
  const customBody = input.thankYouBody?.trim() || `Thank you for registering for ${input.seasonName}.`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2>${subject}</h2>
      <p>Hi ${input.playerName},</p>
      <p>${customBody}</p>
      <hr />
      <h3>Receipt</h3>
      <ul>
        <li><strong>Season:</strong> ${input.seasonName}</li>
        <li><strong>Amount Paid:</strong> $${input.amount.toFixed(2)}</li>
        <li><strong>Paid At:</strong> ${paidDate}</li>
        <li><strong>Registration ID:</strong> ${input.registrationId}</li>
      </ul>
      <p>Please keep this email for your records.</p>
    </div>
  `.trim();
  const textBody = [
    `Hi ${input.playerName},`,
    '',
    customBody,
    '',
    'Receipt',
    `Season: ${input.seasonName}`,
    `Amount Paid: $${input.amount.toFixed(2)}`,
    `Paid At: ${paidDate}`,
    `Registration ID: ${input.registrationId}`,
    '',
    'Please keep this email for your records.',
  ].join('\n');

  return { subject, htmlBody, textBody };
}
