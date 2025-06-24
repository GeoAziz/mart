
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { Timestamp } from 'firebase-admin/firestore';
import type { Conversation, Message } from '@/lib/types';


// GET: Get a single conversation and its messages
async function getConversationHandler(req: AuthenticatedRequest, context: { params: { conversationId: string } }) {
  const authenticatedUser = req.userProfile;
  const { conversationId } = context.params;

  if (!conversationId) {
    return NextResponse.json({ message: 'Conversation ID is missing.' }, { status: 400 });
  }

  try {
    const convoDocRef = firestoreAdmin.collection('conversations').doc(conversationId);
    const convoDocSnap = await convoDocRef.get();

    if (!convoDocSnap.exists) {
      return NextResponse.json({ message: 'Conversation not found.' }, { status: 404 });
    }

    const conversation = convoDocSnap.data() as Conversation;

    // Security check: Ensure the authenticated user is a participant
    if (!conversation.participants.includes(authenticatedUser.uid)) {
      return NextResponse.json({ message: 'Forbidden: You are not a participant in this conversation.' }, { status: 403 });
    }
    
    // Fetch messages
    const messagesSnapshot = await convoDocRef.collection('messages').orderBy('timestamp', 'asc').get();
    const messages = messagesSnapshot.docs.map(doc => {
        const data = doc.data() as Omit<Message, 'id'>;
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
        };
    });

    // Mark conversation as read by the current user
    if (!conversation.readBy.includes(authenticatedUser.uid)) {
      await convoDocRef.update({
        readBy: Timestamp.now(), // Firestore will use server timestamp
      });
    }
    
    // Format conversation for client response
    const clientConversation = {
      id: convoDocSnap.id,
      ...conversation,
      createdAt: conversation.createdAt instanceof Timestamp ? conversation.createdAt.toDate() : new Date(conversation.createdAt),
      updatedAt: conversation.updatedAt instanceof Timestamp ? conversation.updatedAt.toDate() : new Date(conversation.updatedAt),
      lastMessage: {
          ...conversation.lastMessage,
          timestamp: conversation.lastMessage.timestamp instanceof Timestamp ? conversation.lastMessage.timestamp.toDate() : new Date(conversation.lastMessage.timestamp),
      }
    };


    return NextResponse.json({ conversation: clientConversation, messages }, { status: 200 });

  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching conversation.' }, { status: 500 });
  }
}
export const GET = withAuth(getConversationHandler);
