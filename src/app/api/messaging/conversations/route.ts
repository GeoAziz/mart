
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { Conversation, Message } from '@/lib/types';
import { getDoc } from 'firebase/firestore';


// GET: List all conversations for the authenticated user
async function listConversationsHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  try {
    const conversationsSnapshot = await firestoreAdmin
      .collection('conversations')
      .where('participants', 'array-contains', authenticatedUser.uid)
      // .orderBy('lastMessage.timestamp', 'desc') // Removed to avoid composite index error
      .get();

    const conversations = conversationsSnapshot.docs.map(doc => {
      const data = doc.data() as Omit<Conversation, 'id'>;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        lastMessage: {
          ...data.lastMessage,
          timestamp: data.lastMessage.timestamp instanceof Timestamp ? data.lastMessage.timestamp.toDate() : new Date(data.lastMessage.timestamp),
        }
      };
    });
    
    // Sort in-memory after fetching
    conversations.sort((a, b) => {
        const dateA = a.lastMessage.timestamp instanceof Date ? a.lastMessage.timestamp.getTime() : new Date(a.lastMessage.timestamp).getTime();
        const dateB = b.lastMessage.timestamp instanceof Date ? b.lastMessage.timestamp.getTime() : new Date(b.lastMessage.timestamp).getTime();
        return dateB - dateA;
    });

    return NextResponse.json(conversations, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching conversations for user ${authenticatedUser.uid}:`, error);
    if (error.code === 'failed-precondition') {
        console.error('Firestore query failed, likely due to a missing index. The code has been modified to sort in-memory to avoid this, but you may want to create the index in the Firebase console for performance on very large datasets.');
    }
    return NextResponse.json({ message: 'Internal Server Error while fetching conversations.' }, { status: 500 });
  }
}
export const GET = withAuth(listConversationsHandler);


// POST: Send a message (finds or creates a conversation)
const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  text: z.string().min(1),
  context: z.object({
    type: z.enum(['order', 'product', 'general']),
    id: z.string().min(1),
    text: z.string().min(1),
  }),
});

async function sendMessageHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const senderId = authenticatedUser.uid;

  try {
    const body = await req.json();
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request body', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { recipientId, text, context } = validation.data;

    // Fetch recipient's profile to get their name
    const recipientDoc = await firestoreAdmin.collection('users').doc(recipientId).get();
    if (!recipientDoc.exists) {
        return NextResponse.json({ message: 'Recipient not found.' }, { status: 404 });
    }
    const recipientProfile = recipientDoc.data();
    
    const now = new Date();
    const participants = [senderId, recipientId].sort(); // Sort to ensure consistent conversation ID
    
    // Find existing conversation based on participants and context
    const conversationsRef = firestoreAdmin.collection('conversations');
    const existingConvoQuery = conversationsRef
      .where('participants', '==', participants)
      .where('relatedTo.id', '==', context.id)
      .limit(1);

    const existingConvoSnapshot = await existingConvoQuery.get();
    let conversationId: string;
    let conversationRef: FirebaseFirestore.DocumentReference;

    if (!existingConvoSnapshot.empty) {
        // Conversation exists, use it
        const existingDoc = existingConvoSnapshot.docs[0];
        conversationId = existingDoc.id;
        conversationRef = existingDoc.ref;
    } else {
        // Conversation does not exist, create it
        conversationRef = conversationsRef.doc();
        conversationId = conversationRef.id;
    }

    // Create the message and conversation data within a transaction
    await firestoreAdmin.runTransaction(async (transaction) => {
        const newMessageRef = conversationRef.collection('messages').doc();

        // 1. Set the new message
        const newMessageData: Omit<Message, 'id'> = {
            conversationId,
            senderId,
            text,
            timestamp: now,
        };
        transaction.set(newMessageRef, newMessageData);

        // 2. Set or update the conversation document
        const conversationData: Conversation = {
            participants,
            participantNames: {
              [senderId]: authenticatedUser.fullName || 'User',
              [recipientId]: recipientProfile?.fullName || 'User',
            },
            participantAvatars: {
              [senderId]: (authenticatedUser as any).photoURL || '', // Assuming photoURL might be on profile
              [recipientId]: (recipientProfile as any)?.photoURL || '',
            },
            lastMessage: {
              senderId,
              text,
              timestamp: now,
            },
            relatedTo: {
              type: context.type,
              id: context.id,
              text: context.text,
            },
            readBy: [senderId], // Sender has read it by default
            createdAt: now,
            updatedAt: now,
        };
        
        // Use set with merge:true to create if new, or update if existing.
        // On creation, createdAt won't be overwritten on subsequent updates.
        transaction.set(conversationRef, {
            ...conversationData,
            createdAt: existingConvoSnapshot.empty ? now : (existingConvoSnapshot.docs[0].data().createdAt || now)
        }, { merge: true });
    });

    return NextResponse.json({ message: 'Message sent successfully', conversationId }, { status: 201 });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ message: 'Internal Server Error while sending message.' }, { status: 500 });
  }
}
export const POST = withAuth(sendMessageHandler);
