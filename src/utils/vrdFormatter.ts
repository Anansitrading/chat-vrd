import { Message } from '../types';
import TurndownService from 'turndown';

export interface VRDContent {
  projectOverview: string;
  requirements: string[];
  technicalSpecs: string;
  timeline: string;
  budget: string;
  additionalNotes?: string;
}

export interface VRDDocument {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  content: VRDContent;
  conversationHistory: Message[];
  type: 'pdf' | 'markdown';
  blob?: Blob;
}

class VrdFormatter {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced'
    });

    // Customize Turndown for better Markdown output
    this.turndown.addRule('emphasis', {
      filter: ['em', 'i'],
      replacement: function (content) {
        return '*' + content + '*';
      }
    });
  }

  /**
   * Formats chat messages into a structured VRD document
   */
  public formatVRD(messages: Message[], title: string): VRDDocument {
    const vrd: VRDDocument = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: this.extractContent(messages),
      conversationHistory: messages,
      type: 'markdown'
    };

    return vrd;
  }

  /**
   * Extracts structured content from chat messages
   */
  private extractContent(messages: Message[]): VRDContent {
    // Initialize content sections
    const content: VRDContent = {
      projectOverview: '',
      requirements: [],
      technicalSpecs: '',
      timeline: '',
      budget: '',
      additionalNotes: ''
    };

    // Find relevant messages for each section
    messages.forEach(msg => {
      if (msg.role === 'assistant') {
        // Project Overview - usually at the start
        if (msg.text.toLowerCase().includes('project overview') || 
            msg.text.toLowerCase().includes('project description')) {
          content.projectOverview = this.extractSection(msg.text, 'project overview');
        }

        // Requirements - look for bullet points and numbered lists
        if (msg.text.toLowerCase().includes('requirements') ||
            msg.text.toLowerCase().includes('features needed')) {
          content.requirements = this.extractRequirements(msg.text);
        }

        // Technical Specs
        if (msg.text.toLowerCase().includes('technical') || 
            msg.text.toLowerCase().includes('specifications')) {
          content.technicalSpecs = this.extractSection(msg.text, 'technical specifications');
        }

        // Timeline
        if (msg.text.toLowerCase().includes('timeline') || 
            msg.text.toLowerCase().includes('schedule')) {
          content.timeline = this.extractSection(msg.text, 'timeline');
        }

        // Budget
        if (msg.text.toLowerCase().includes('budget') || 
            msg.text.toLowerCase().includes('cost')) {
          content.budget = this.extractSection(msg.text, 'budget');
        }
      }
    });

    return content;
  }

  /**
   * Extracts a specific section from text
   */
  private extractSection(text: string, sectionName: string): string {
    const sections = text.split(/(?=##?\s+[A-Z])/);
    const section = sections.find(s => 
      s.toLowerCase().includes(sectionName.toLowerCase())
    );
    return section ? this.cleanText(section) : '';
  }

  /**
   * Extracts requirements from text
   */
  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];
    const lines = text.split('\n');

    let inRequirementsList = false;
    lines.forEach(line => {
      // Check if this is a requirement (starts with bullet or number)
      if (line.match(/^[-*•]|\d+\./)) {
        inRequirementsList = true;
        requirements.push(this.cleanText(line));
      } else if (inRequirementsList && line.trim() === '') {
        inRequirementsList = false;
      }
    });

    return requirements;
  }

  /**
   * Cleans and formats text
   */
  private cleanText(text: string): string {
    return text
      .replace(/^[-*•]\s+/, '') // Remove bullet points
      .replace(/^\d+\.\s+/, '') // Remove numbering
      .trim();
  }

  /**
   * Converts VRD to Markdown format
   */
  public toMarkdown(vrd: VRDDocument): string {
    let md = `# ${vrd.title}\n\n`;
    md += `_Generated on ${vrd.createdAt.toLocaleDateString()}_\n\n`;

    // Project Overview
    if (vrd.content.projectOverview) {
      md += `## Project Overview\n\n${vrd.content.projectOverview}\n\n`;
    }

    // Requirements
    if (vrd.content.requirements.length > 0) {
      md += '## Requirements\n\n';
      vrd.content.requirements.forEach(req => {
        md += `- ${req}\n`;
      });
      md += '\n';
    }

    // Technical Specifications
    if (vrd.content.technicalSpecs) {
      md += `## Technical Specifications\n\n${vrd.content.technicalSpecs}\n\n`;
    }

    // Timeline
    if (vrd.content.timeline) {
      md += `## Timeline\n\n${vrd.content.timeline}\n\n`;
    }

    // Budget
    if (vrd.content.budget) {
      md += `## Budget\n\n${vrd.content.budget}\n\n`;
    }

    // Additional Notes
    if (vrd.content.additionalNotes) {
      md += `## Additional Notes\n\n${vrd.content.additionalNotes}\n\n`;
    }

    return md;
  }

  /**
   * Converts HTML content to Markdown
   */
  public htmlToMarkdown(html: string): string {
    return this.turndown.turndown(html);
  }
}

export const vrdFormatter = new VrdFormatter();