// A source document (PDF, DOCX, Text, etc.)
export interface Source {
  id: string;
  type: 'pdf' | 'docx' | 'text' | 'pasted' | 'ppt';
  title: string;
  content: string; // The full text content after parsing
  status: 'pending' | 'ingesting' | 'complete' | 'error';
  file?: File; // Original file for PDFs, DOCX, etc.
}

// A chunk of text from a source document
export interface Chunk {
  id: string;
  sourceId: string;
  content: string;
  metadata: {
    page?: number; // For PDFs
    sourceTitle: string;
  };
}

// Inline citation pointing to a source
export interface Citation {
  sourceTitle: string;
  page?: number;
  text: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  citation: Citation;
}

// The final structured output from the research agent
export interface ResearchOutput {
  shortSummary: { content: string; citations: Citation[] };
  extendedSummary: string; // Markdown format
  insights: { content: string; citation: Citation }[];
  quotes: { content: string; citation: Citation }[];
  nextSteps: { content: string; explanation: string }[];
  quiz: QuizQuestion[];
  // The raw chunks used to generate the answer
  evidenceChunks: Chunk[];
}

// Represents a complete research session that can be saved to history
export interface ResearchSession {
    id: string;
    topic: string;
    sources: Source[];
    results: ResearchOutput | null;
    createdAt: string;
}
