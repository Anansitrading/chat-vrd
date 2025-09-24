import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Download, Eye, X } from 'lucide-react';
import { documentStorage, StoredDocument } from '../utils/documentStorage';
import { VRDDocument } from '../utils/vrdFormatter';

interface DocumentsSidebarProps {
  onClose?: () => void;
  onDocumentSelect?: (doc: VRDDocument) => void;
}

export const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  onClose,
  onDocumentSelect
}) => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<VRDDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await documentStorage.getRecentDocuments(50);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search documents
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.preview && doc.preview.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle document preview
  const handlePreview = async (docId: string) => {
    try {
      const doc = await documentStorage.getDocument(docId);
      if (doc) {
        setSelectedDoc(doc);
        setShowPreview(true);
        if (onDocumentSelect) {
          onDocumentSelect(doc);
        }
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  // Handle document download
  const handleDownload = async (doc: StoredDocument) => {
    try {
      const blob = await documentStorage.exportDocument(doc.id, doc.type);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.${doc.type === 'pdf' ? 'pdf' : 'md'}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  // Handle document deletion
  const handleDelete = async (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await documentStorage.deleteDocument(docId);
        await loadDocuments(); // Reload the list
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <>
      {/* Documents List Section */}
      <div className="documents-sidebar h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Saved Documents
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close documents"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                       text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? 'No documents found' : 'No saved documents yet'}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="group bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200
                           border border-transparent hover:border-purple-500/30 cursor-pointer"
                  onClick={() => handlePreview(doc.id)}
                >
                  {/* Document Info */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{formatDate(doc.createdAt)}</span>
                        <span>•</span>
                        <span>{doc.type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(doc.id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        aria-label="Preview document"
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        aria-label="Download document"
                      >
                        <Download className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Preview Text */}
                  {doc.preview && (
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {doc.preview}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Storage Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-gray-400">
            {documents.length} document{documents.length !== 1 ? 's' : ''} saved
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedDoc && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">{selectedDoc.title}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                {/* Project Overview */}
                {selectedDoc.content.projectOverview && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Project Overview</h3>
                    <p className="text-gray-300">{selectedDoc.content.projectOverview}</p>
                  </div>
                )}

                {/* Requirements */}
                {selectedDoc.content.requirements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Requirements</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedDoc.content.requirements.map((req, index) => (
                        <li key={index} className="text-gray-300">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical Specs */}
                {selectedDoc.content.technicalSpecs && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Technical Specifications</h3>
                    <p className="text-gray-300">{selectedDoc.content.technicalSpecs}</p>
                  </div>
                )}

                {/* Timeline */}
                {selectedDoc.content.timeline && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Timeline</h3>
                    <p className="text-gray-300">{selectedDoc.content.timeline}</p>
                  </div>
                )}

                {/* Budget */}
                {selectedDoc.content.budget && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">Budget</h3>
                    <p className="text-gray-300">{selectedDoc.content.budget}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => handleDownload({
                  id: selectedDoc.id,
                  title: selectedDoc.title,
                  createdAt: selectedDoc.createdAt,
                  updatedAt: selectedDoc.updatedAt,
                  type: selectedDoc.type
                })}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg 
                         transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};