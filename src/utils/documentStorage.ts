import { get, set, del, entries, clear } from 'idb-keyval';
import { VRDDocument } from './vrdFormatter';

const DOCUMENTS_KEY = 'vrd_documents';
const DOCUMENT_PREFIX = 'vrd_doc_';

export interface StoredDocument {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  type: 'pdf' | 'markdown';
  size?: number;
  preview?: string; // First few lines for preview
}

class DocumentStorage {
  /**
   * Save a VRD document
   */
  async saveDocument(doc: VRDDocument): Promise<void> {
    try {
      // Save the full document
      await set(`${DOCUMENT_PREFIX}${doc.id}`, doc);

      // Update the documents index
      const index = await this.getDocumentsIndex();
      const storedDoc: StoredDocument = {
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        type: doc.type,
        size: doc.blob ? doc.blob.size : 0,
        preview: this.generatePreview(doc)
      };

      const existingIndex = index.findIndex(d => d.id === doc.id);
      if (existingIndex !== -1) {
        index[existingIndex] = storedDoc;
      } else {
        index.push(storedDoc);
      }

      await set(DOCUMENTS_KEY, index);
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<VRDDocument | null> {
    try {
      const doc = await get(`${DOCUMENT_PREFIX}${id}`);
      if (doc) {
        // Convert dates back from strings
        doc.createdAt = new Date(doc.createdAt);
        doc.updatedAt = new Date(doc.updatedAt);
      }
      return doc || null;
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  }

  /**
   * Get all documents index
   */
  async getDocumentsIndex(): Promise<StoredDocument[]> {
    try {
      const index = await get(DOCUMENTS_KEY);
      if (index) {
        // Convert dates back from strings
        return index.map((doc: any) => ({
          ...doc,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting documents index:', error);
      return [];
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      // Delete the document
      await del(`${DOCUMENT_PREFIX}${id}`);

      // Update the index
      const index = await this.getDocumentsIndex();
      const updatedIndex = index.filter(d => d.id !== id);
      await set(DOCUMENTS_KEY, updatedIndex);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Delete all documents
   */
  async clearAllDocuments(): Promise<void> {
    try {
      // Get all entries to find document keys
      const allEntries = await entries();
      
      // Delete all document entries
      for (const [key] of allEntries) {
        if (typeof key === 'string' && key.startsWith(DOCUMENT_PREFIX)) {
          await del(key);
        }
      }

      // Clear the index
      await set(DOCUMENTS_KEY, []);
    } catch (error) {
      console.error('Error clearing all documents:', error);
      throw error;
    }
  }

  /**
   * Search documents by title
   */
  async searchDocuments(query: string): Promise<StoredDocument[]> {
    try {
      const index = await this.getDocumentsIndex();
      const searchTerm = query.toLowerCase();
      return index.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        (doc.preview && doc.preview.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(limit: number = 10): Promise<StoredDocument[]> {
    try {
      const index = await this.getDocumentsIndex();
      return index
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent documents:', error);
      return [];
    }
  }

  /**
   * Export a document as a file
   */
  async exportDocument(id: string, format: 'pdf' | 'markdown'): Promise<Blob | null> {
    try {
      const doc = await this.getDocument(id);
      if (!doc) return null;

      if (format === 'pdf' && doc.blob) {
        return doc.blob;
      }

      if (format === 'markdown') {
        // Convert to markdown if needed
        const { vrdFormatter } = await import('./vrdFormatter');
        const markdown = vrdFormatter.toMarkdown(doc);
        return new Blob([markdown], { type: 'text/markdown' });
      }

      return null;
    } catch (error) {
      console.error('Error exporting document:', error);
      return null;
    }
  }

  /**
   * Generate preview text for a document
   */
  private generatePreview(doc: VRDDocument): string {
    const preview = [];
    
    if (doc.content.projectOverview) {
      preview.push(doc.content.projectOverview.substring(0, 100));
    }
    
    if (doc.content.requirements.length > 0) {
      preview.push(doc.content.requirements[0]);
    }

    return preview.join(' ').substring(0, 200) + '...';
  }

  /**
   * Get storage usage stats
   */
  async getStorageStats(): Promise<{
    documentCount: number;
    totalSize: number;
  }> {
    try {
      const index = await this.getDocumentsIndex();
      const totalSize = index.reduce((acc, doc) => acc + (doc.size || 0), 0);
      
      return {
        documentCount: index.length,
        totalSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { documentCount: 0, totalSize: 0 };
    }
  }
}

export const documentStorage = new DocumentStorage();