import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface User {
  id: string;
  email: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant';
  parent_message_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      chat_sessions: {
        Row: ChatSession;
        Insert: {
          user_id: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: Message;
        Insert: {
          chat_id: string;
          user_id: string;
          content: string;
          role: 'user' | 'assistant';
          parent_message_id?: string;
        };
        Update: {
          content?: string;
          updated_at?: string;
        };
      };
    };
  };
}

class SupabaseService {
  private client: any; // TODO: Fix Supabase types properly

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    // Debug logging
    console.log('[Supabase] Initializing with URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('[Supabase] Anon key:', supabaseAnonKey ? 'Set' : 'Missing');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase configuration is missing. Chat history features will not be available.');
      this.client = null as any; // Will cause errors if used without proper config
      return;
    }

    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Client created successfully');
  }

  /**
   * Initialize the service and ensure user authentication
   */
  async initialize() {
    if (!this.client) {
      console.warn('Supabase client not configured');
      return null;
    }

    try {
      // First check if we have an existing session
      const { data: { session } } = await this.client.auth.getSession();
      
      if (session && session.user) {
        console.log('Using existing session for user:', session.user.id);
        return session.user;
      }
      
      // If no session, sign in anonymously
      console.log('No existing session, signing in anonymously...');
      const { data, error } = await this.client.auth.signInAnonymously();
      if (error) {
        console.error('Failed to sign in anonymously:', error);
        // Try one more time with a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await this.client.auth.signInAnonymously();
        if (retryResult.error) {
          console.error('Retry failed:', retryResult.error);
          return null;
        }
        console.log('Retry successful, signed in as:', retryResult.data.user?.id);
        return retryResult.data.user;
      }
      
      console.log('Signed in anonymously as:', data.user?.id);
      return data.user;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return null;
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser() {
    if (!this.client) return null;
    
    try {
      // First try to get the session (more reliable than getUser)
      const { data: { session }, error: sessionError } = await this.client.auth.getSession();
      
      if (session?.user) {
        return session.user;
      }
      
      // No session exists, try to initialize
      console.log('No session found, initializing auth...');
      return await this.initialize();
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      // As a fallback, try to initialize
      return await this.initialize();
    }
  }

  /**
   * Sign in anonymously for demo purposes
   */
  async signInAnonymously() {
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
    return data.user;
  }

  /**
   * Create a new chat session
   */
  async createChatSession(title?: string): Promise<ChatSession | null> {
    const user = await this.getCurrentUser();
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    const { data, error } = await this.client
      .from('chat_sessions')
      .insert([
        { 
          user_id: user.id, 
          title: title || `Chat ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all chat sessions for the current user
   */
  async getChatSessions(): Promise<ChatSession[]> {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.client
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a specific chat session
   */
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const { data, error } = await this.client
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching chat session:', error);
      return null;
    }

    return data;
  }

  /**
   * Update a chat session
   */
  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<boolean> {
    const { error } = await this.client
      .from('chat_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating chat session:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete a chat session and all its messages
   */
  async deleteChatSession(sessionId: string): Promise<boolean> {
    // Delete messages first due to foreign key constraints
    const { error: messagesError } = await this.client
      .from('messages')
      .delete()
      .eq('chat_id', sessionId);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
      return false;
    }

    // Then delete the session
    const { error: sessionError } = await this.client
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error deleting chat session:', sessionError);
      return false;
    }

    return true;
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(
    chatId: string,
    content: string,
    role: 'user' | 'assistant',
    parentMessageId?: string
  ): Promise<Message | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await this.client
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          user_id: user.id,
          content,
          role,
          parent_message_id: parentMessageId
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return null;
    }

    // Update session's updated_at timestamp
    await this.updateChatSession(chatId, {});

    return data;
  }

  /**
   * Get messages for a chat session
   */
  async getMessages(chatId: string, limit = 100): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update a message (for editing functionality)
   */
  async updateMessage(messageId: string, content: string): Promise<boolean> {
    const { error } = await this.client
      .from('messages')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error updating message:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await this.client
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }

    return true;
  }

  /**
   * Get quoted message details for reply context
   */
  async getQuotedMessage(messageId: string): Promise<Message | null> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error fetching quoted message:', error);
      return null;
    }

    return data;
  }

  /**
   * Search messages across all user's chat sessions
   */
  async searchMessages(query: string, limit = 50): Promise<Message[]> {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.client
      .from('messages')
      .select(`
        *,
        chat_sessions!inner(user_id)
      `)
      .eq('chat_sessions.user_id', user.id)
      .textSearch('content', query)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if service is properly configured
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Get the Supabase client for advanced operations
   */
  getClient(): any {
    return this.client;
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();