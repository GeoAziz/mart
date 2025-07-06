'use server';

import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Message, Conversation } from '@/lib/types';

// Get all conversations for the authenticated user
async function getConversationsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    const conversationsSnapshot = await firestoreAdmin
      .collection('conversations')
      .where('participants', 'array-contains', authenticatedUser.uid)
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = conversationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastMessage: {
        ...doc.data().lastMessage,
        timestamp: doc.data().lastMessage?.timestamp?.toDate(),
      },
    })) as Conversation[];

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// Send a new message
async function sendMessageHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    const { conversationId, text, recipientId } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { message: 'Message text is required' },
        { status: 400 }
      );
    }

    let conversation;
    const now = new Date();

    // Create or get conversation
    if (!conversationId) {
      if (!recipientId) {
        return NextResponse.json(
          { message: 'Recipient ID is required for new conversations' },
          { status: 400 }
        );
      }

      // Get recipient's profile
      const recipientDoc = await firestoreAdmin
        .collection('users')
        .doc(recipientId)
        .get();

      if (!recipientDoc.exists) {
        return NextResponse.json(
          { message: 'Recipient not found' },
          { status: 404 }
        );
      }

      // Create new conversation
      const newConversation = {
        participants: [authenticatedUser.uid, recipientId],
        participantNames: {
          [authenticatedUser.uid]: authenticatedUser.fullName || 'Unknown User',
          [recipientId]: recipientDoc.data()?.fullName || 'Unknown User',
        },
        createdAt: now,
        updatedAt: now,
        lastMessage: {
          text: text.substring(0, 100),
          senderId: authenticatedUser.uid,
          timestamp: now,
        },
        unreadBy: [recipientId],
      };

      conversation = await firestoreAdmin
        .collection('conversations')
        .add(newConversation);
    } else {
      conversation = firestoreAdmin.collection('conversations').doc(conversationId);
      const convoDoc = await conversation.get();

      if (!convoDoc.exists) {
        return NextResponse.json(
          { message: 'Conversation not found' },
          { status: 404 }
        );
      }

      const convoData = convoDoc.data() as Conversation;
      if (!convoData.participants.includes(authenticatedUser.uid)) {
        return NextResponse.json(
          { message: 'Not authorized to send messages in this conversation' },
          { status: 403 }
        );
      }

      // Update conversation
      await conversation.update({
        updatedAt: now,
        lastMessage: {
          text: text.substring(0, 100),
          senderId: authenticatedUser.uid,
          timestamp: now,
        },
        unreadBy: convoData.participants.filter(p => p !== authenticatedUser.uid),
      });
    }

    // Add message to conversation
    const message: Omit<Message, 'id'> = {
      conversationId: conversation.id,
      senderId: authenticatedUser.uid,
      text,
      timestamp: now,
    };

    await conversation
      .collection('messages')
      .add(message);

    return NextResponse.json({ 
      message: 'Message sent successfully',
      conversationId: conversation.id
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getConversationsHandler);
export const POST = withAuth(sendMessageHandler);