import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ChatService } from '../src/chat/chat.service';
import type { ChatStreamEvent } from '../src/chat/types/chat-stream-event';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const chat = app.get(ChatService);
  let conversationId: string | null = null;
  let temporaryUserId: string | null = null;

  try {
    const fixture = await prisma.document.findFirst({
      where: {
        name: '祝梦瑶520历政地初选方案.pdf',
        status: 'PUBLISHED',
        knowledgeBase: { status: 'ACTIVE' },
      },
      select: {
        organizationId: true,
        departmentId: true,
        knowledgeBaseId: true,
      },
    });
    if (!fixture) throw new Error('Published RAG fixture was not found.');

    let member = await prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        memberships: {
          some: {
            departmentId: fixture.departmentId,
            status: 'ACTIVE',
            roles: { some: { role: { name: 'DEPARTMENT_MEMBER' } } },
          },
        },
      },
      select: { id: true },
    });
    if (!member) {
      const role = await prisma.role.findUnique({
        where: {
          organizationId_name: {
            organizationId: fixture.organizationId,
            name: 'DEPARTMENT_MEMBER',
          },
        },
        select: { id: true },
      });
      if (!role) throw new Error('Department member role was not found.');
      member = await prisma.user.create({
        data: {
          organizationId: fixture.organizationId,
          email: `rag-verify-${Date.now()}@ai-workspace.local`,
          username: `rag-verify-${Date.now()}`,
          passwordHash: 'verification-only',
          memberships: {
            create: {
              departmentId: fixture.departmentId,
              status: 'ACTIVE',
              roles: { create: { roleId: role.id } },
            },
          },
        },
        select: { id: true },
      });
      temporaryUserId = member.id;
    }

    const conversation = await chat.createConversation({
      userId: member.id,
      organizationId: fixture.organizationId,
      departmentId: fixture.departmentId,
      knowledgeBaseId: fixture.knowledgeBaseId,
      title: 'RAG lifecycle verification',
    });
    conversationId = conversation.id;

    const events: ChatStreamEvent[] = [];
    for await (const event of chat.streamMessage(
      conversation.id,
      member.id,
      '郑州升达经贸管理学院有哪些专业？',
      'zh-CN',
    )) {
      events.push(event);
    }

    const start = events.find((event) => event.type === 'start');
    const retrieval = events.find((event) => event.type === 'retrieval');
    const citationEvent = events.find((event) => event.type === 'citations');
    const done = events.find((event) => event.type === 'done');
    if (!start || !done)
      throw new Error('SSE start/done lifecycle is incomplete.');
    if (!retrieval || !['grounded', 'partial'].includes(retrieval.status)) {
      throw new Error(`Unexpected retrieval status: ${retrieval?.status}`);
    }
    if (!citationEvent || citationEvent.citations.length === 0) {
      throw new Error('Grounded answer did not expose citations.');
    }

    const messages = await chat.getMessages(conversation.id, member.id);
    const assistant = messages.find(
      (message) =>
        message.id === start.messageId && message.role === 'ASSISTANT',
    );
    if (!assistant?.content.trim())
      throw new Error('Assistant response was not persisted.');
    if (assistant.retrievalStatus !== retrieval.status)
      throw new Error('Persisted RAG trace status does not match SSE status.');

    await chat.saveMessageFeedback(
      start.messageId,
      member.id,
      true,
      'V1 check',
    );
    const feedback = await prisma.messageFeedback.findUnique({
      where: {
        messageId_userId: { messageId: start.messageId, userId: member.id },
      },
      select: { helpful: true },
    });
    if (!feedback?.helpful)
      throw new Error('Message feedback was not persisted.');

    console.log(
      JSON.stringify(
        {
          status: 'passed',
          retrievalStatus: retrieval.status,
          eventTypes: events.map((event) => event.type),
          citationCount: citationEvent.citations.length,
          responseLength: assistant.content.length,
          tracePersisted: true,
          feedbackPersisted: true,
        },
        null,
        2,
      ),
    );
  } finally {
    if (conversationId) {
      await prisma.conversation.deleteMany({ where: { id: conversationId } });
    }
    if (temporaryUserId) {
      await prisma.membership.deleteMany({
        where: { userId: temporaryUserId },
      });
      await prisma.user.deleteMany({ where: { id: temporaryUserId } });
    }
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
