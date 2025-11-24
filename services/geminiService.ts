import { GoogleGenAI, Type } from "@google/genai";
import { Chunk, ResearchOutput, Source } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Splits a long text into smaller, overlapping chunks.
 */
export const chunkerAgent = (sources: Source[]): Chunk[] => {
    const allChunks: Chunk[] = [];
    const CHUNK_SIZE = 1800;
    const CHUNK_OVERLAP = 200;

    sources.forEach(source => {
        const text = source.content;
        if (!text) return;

        for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
            const content = text.substring(i, i + CHUNK_SIZE);
            allChunks.push({
                id: `${source.id}-chunk-${allChunks.length}`,
                sourceId: source.id,
                content,
                metadata: {
                    sourceTitle: source.title,
                    // In a real scenario, page number would be extracted during parsing.
                    // For simplicity, we are omitting it here.
                }
            });
        }
    });

    return allChunks;
};


/**
 * Uses the generative model to select the most relevant chunks of text.
 * This simulates the "retrieval" step of RAG without a traditional vector DB.
 */
export const retrievalAgent = async (topic: string, chunks: Chunk[]): Promise<Chunk[]> => {
    try {
        const context = chunks.map((chunk, index) => `[CHUNK ${index}] ${chunk.content}`).join('\n\n');
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a research assistant. Your task is to select the most relevant text chunks to answer a query.
Topic: "${topic}"

From the following text chunks, select the top 5-10 most relevant ones. Return ONLY the indices of the selected chunks, separated by commas (e.g., "1,5,12"). Do not add any other text or explanation.

CONTEXT:
${context}`,
        });

        const indicesStr = response.text.trim();
        const relevantIndices = indicesStr.split(',').map(i => parseInt(i.trim(), 10)).filter(i => !isNaN(i) && i < chunks.length);
        
        if (relevantIndices.length === 0) {
           // Fallback to taking the first 10 chunks if retrieval fails
           return chunks.slice(0, 10);
        }

        return relevantIndices.map(index => chunks[index]);
    } catch (error) {
        console.error("Error in retrievalAgent:", error);
        // Fallback in case of API error
        return chunks.slice(0, 10);
    }
};

/**
 * The main synthesis agent. Takes retrieved context and generates all research outputs
 * in a single, structured JSON format.
 */
export const synthesisAgent = async (topic: string, contextChunks: Chunk[]): Promise<ResearchOutput> => {
     const context = contextChunks.map(chunk => 
        `[Source: ${chunk.metadata.sourceTitle}]\n${chunk.content}`
    ).join('\n\n---\n\n');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `You are an expert research assistant. Your task is to generate a comprehensive research report on a given topic using ONLY the provided context.
You must adhere to the following rules:
1.  **NEVER** use information outside of the provided context.
2.  **ALWAYS** cite your claims. A citation must include the source title and the exact text snippet from the context that supports your claim.
3.  Generate all outputs in the specified JSON format.

TOPIC: "${topic}"

CONTEXT:
${context}
`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        shortSummary: {
                            type: Type.OBJECT,
                            properties: {
                                content: { type: Type.STRING, description: "A 2-4 sentence summary of the main ideas." },
                                citations: { type: Type.ARRAY, items: { 
                                    type: Type.OBJECT, properties: { 
                                        sourceTitle: { type: Type.STRING }, text: { type: Type.STRING, description: "The exact quote from the context." } 
                                    }, required: ["sourceTitle", "text"]
                                }}
                            }, required: ["content", "citations"]
                        },
                        extendedSummary: { type: Type.STRING, description: "A 3-6 paragraph summary in Markdown format. Cite claims inline using '[Source: Title]'." },
                        insights: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT, properties: {
                                    content: { type: Type.STRING, description: "A key insight or finding." },
                                    citation: { type: Type.OBJECT, properties: { sourceTitle: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["sourceTitle", "text"] }
                                }, required: ["content", "citation"]
                            }
                        },
                        quotes: {
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT, properties: {
                                    content: { type: Type.STRING, description: "A direct, impactful quote from the context." },
                                    citation: { type: Type.OBJECT, properties: { sourceTitle: { type: Type.STRING }, text: { type: Type.STRING, description: "Should be the same as content" } }, required: ["sourceTitle", "text"] }
                                }, required: ["content", "citation"]
                            }
                        },
                        nextSteps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT, properties: {
                                    content: { type: Type.STRING, description: "A suggested next experiment or research question." },
                                    explanation: { type: Type.STRING, description: "Why this step is important, based on gaps in the context." }
                                }, required: ["content", "explanation"]
                            }
                        },
                        quiz: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswer: { type: Type.STRING },
                                    explanation: { type: Type.STRING, description: "An explanation for the correct answer." },
                                    citation: { type: Type.OBJECT, properties: { sourceTitle: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["sourceTitle", "text"] }
                                },
                                required: ["question", "options", "correctAnswer", "explanation", "citation"]
                            }
                        }
                    },
                    required: ["shortSummary", "extendedSummary", "insights", "quotes", "nextSteps", "quiz"]
                },
            },
        });
        
        const jsonText = response.text.trim();
        const generatedOutput = JSON.parse(jsonText);
        
        return {
            ...generatedOutput,
            evidenceChunks: contextChunks,
        };

    } catch (error) {
        console.error("Error in synthesisAgent:", error);
        throw new Error("Failed to synthesize the research report.");
    }
};
