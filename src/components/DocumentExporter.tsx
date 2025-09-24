import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, FileText, FilePlus } from 'lucide-react';
import { Message } from '../types';
import { vrdFormatter } from '../utils/vrdFormatter';
import { documentStorage } from '../utils/documentStorage';

interface DocumentExporterProps {
  messages: Message[];
  title?: string;
  onExportComplete?: (documentId: string) => void;
  className?: string;
}

export const DocumentExporter: React.FC<DocumentExporterProps> = ({
  messages,
  title = 'Video Requirements Document',
  onExportComplete,
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  /**
   * Export as PDF
   */
  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      // Format the VRD
      const vrd = vrdFormatter.formatVRD(messages, title);
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(vrd.title, 20, 20);
      
      // Add date
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Generated on ${vrd.createdAt.toLocaleDateString()}`, 20, 30);
      
      // Reset text color
      pdf.setTextColor(0);
      let yPosition = 45;
      
      // Add Project Overview
      if (vrd.content.projectOverview) {
        pdf.setFontSize(14);
        pdf.text('Project Overview', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(vrd.content.projectOverview, 170);
        pdf.text(lines, 20, yPosition);
        yPosition += lines.length * 5 + 10;
      }
      
      // Add Requirements
      if (vrd.content.requirements.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text('Requirements', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        vrd.content.requirements.forEach((req, index) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          const bullet = `${index + 1}. ${req}`;
          const lines = pdf.splitTextToSize(bullet, 170);
          pdf.text(lines, 20, yPosition);
          yPosition += lines.length * 5 + 3;
        });
        yPosition += 7;
      }
      
      // Add Technical Specs
      if (vrd.content.technicalSpecs) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text('Technical Specifications', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(vrd.content.technicalSpecs, 170);
        pdf.text(lines, 20, yPosition);
        yPosition += lines.length * 5 + 10;
      }
      
      // Add Timeline
      if (vrd.content.timeline) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text('Timeline', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(vrd.content.timeline, 170);
        pdf.text(lines, 20, yPosition);
        yPosition += lines.length * 5 + 10;
      }
      
      // Add Budget
      if (vrd.content.budget) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text('Budget', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(vrd.content.budget, 170);
        pdf.text(lines, 20, yPosition);
      }
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Save document with PDF blob
      vrd.type = 'pdf';
      vrd.blob = pdfBlob;
      await documentStorage.saveDocument(vrd);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vrd.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      if (onExportComplete) {
        onExportComplete(vrd.id);
      }
      
      setShowMenu(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export as Markdown
   */
  const exportAsMarkdown = async () => {
    setIsExporting(true);
    try {
      // Format the VRD
      const vrd = vrdFormatter.formatVRD(messages, title);
      
      // Convert to markdown
      const markdown = vrdFormatter.toMarkdown(vrd);
      
      // Create blob and download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vrd.title.replace(/[^a-z0-9]/gi, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Save document
      vrd.type = 'markdown';
      await documentStorage.saveDocument(vrd);
      
      if (onExportComplete) {
        onExportComplete(vrd.id);
      }
      
      setShowMenu(false);
    } catch (error) {
      console.error('Error exporting Markdown:', error);
      alert('Failed to export Markdown. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Save to documents (without download)
   */
  const saveToDocuments = async () => {
    setIsExporting(true);
    try {
      // Format and save the VRD
      const vrd = vrdFormatter.formatVRD(messages, title);
      await documentStorage.saveDocument(vrd);
      
      if (onExportComplete) {
        onExportComplete(vrd.id);
      }
      
      alert('Document saved successfully!');
      setShowMenu(false);
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`document-exporter relative ${className}`}>
      {/* Export Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting || messages.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 
                   text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 
                   transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        <span>Export VRD</span>
      </button>

      {/* Export Menu */}
      {showMenu && (
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg 
                        shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[200px]">
          <div className="p-2">
            <button
              onClick={exportAsPDF}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <span className="text-gray-700 dark:text-gray-300">Export as PDF</span>
            </button>
            
            <button
              onClick={exportAsMarkdown}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">Export as Markdown</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            
            <button
              onClick={saveToDocuments}
              disabled={isExporting}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FilePlus className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Save to Documents</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 dark:text-gray-300">Exporting document...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};