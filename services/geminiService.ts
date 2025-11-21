import { GoogleGenAI } from "@google/genai";
import { UploadedFile, ChatMessage, MessageRole } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. The "Librarian" Function (Fast Router)
export const identifyRelevantFiles = async (
  availableFiles: UploadedFile[],
  query: string,
  caseFiles: UploadedFile[]
): Promise<string[]> => {
  // Only look at Law files for filtering
  const lawFiles = availableFiles.filter(f => f.category === 'law' || !f.category);
  
  if (lawFiles.length === 0) return [];

  // We only send metadata (names), not content, to save tokens
  const fileList = lawFiles.map(f => `- ID: ${f.id}, Emri: ${f.name}`).join('\n');
  const caseContext = caseFiles.map(f => f.name).join(', ');

  const prompt = `
    Ti je një "Bibliotekar Ligjor" inteligjent. 
    Detyra jote është të zgjedhësh cilat ligje/kode duhen për t'iu përgjigjur pyetjes së përdoruesit.
    
    KONTEKSTI:
    Dosja e Çështjes: ${caseContext || "Nuk ka"}
    Pyetja e Përdoruesit: "${query}"
    
    LISTA E DOKUMENTEVE TË DISPONUESHME (BAZA LIGJORE):
    ${fileList}
    
    UDHËZIM:
    Kthe vetëm një listë JSON me ID-të e dokumenteve më relevante (maksimumi 5).
    Nëse pyetja është e përgjithshme, zgjidh kodet kryesore (Civil, Penal).
    Shembull Output: ["id_123", "id_456"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1 // Very precise
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const ids = JSON.parse(text);
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.error("RAG Selection Failed:", error);
    return []; // Fallback: return empty (App handles fallback to manual)
  }
};

// 2. The "Lawyer" Function (Deep Analysis)
export const streamResponse = async (
  files: UploadedFile[],
  history: ChatMessage[],
  currentMessage: string,
  onChunk: (text: string) => void
): Promise<string> => {
  
  const modelId = 'gemini-2.5-flash';

  const caseFiles = files.filter(f => f.category === 'case').map(f => f.name).join(', ');
  const lawFiles = files.filter(f => f.category === 'law' || !f.category).map(f => f.name).join(', ');

  const systemInstruction = `Je një Avokat, Noter dhe Konsulent Ligjor Ekspert i liçensuar në Republikën e Shqipërisë (Senior Partner).
  
  KONTEKSTI I DOKUMENTEVE TË PËRZGJEDHURA PËR KËTË BISEDË:
  1. **DOSJA E ÇËSHTJES:** ${caseFiles || 'Asnjë'}.
  2. **BAZA LIGJORE (E filtruar):** ${lawFiles || 'Asnjë'}.

  DETYRA JOTE:
  Përgjigju pyetjes duke analizuar faktet e çështjes bazuar vetëm në ligjet e mësipërme.
  
  METODOLOGJIA E AVANCUAR (RAG):
  Sistemi ka përzgjedhur tashmë ligjet më relevante për këtë pyetje. 
  - Nëse ligjet e ofruara mjaftojnë, jep opinion ligjor përfundimtar.
  - Nëse ndjen se mungon një ligj kritik që nuk është në listën e mësipërme, përmende: "Për një analizë më të plotë, do të nevojitej edhe [Emri i Ligjit]".

  STILI DHE FORMATIMI:
  - Përdor terma juridikë të saktë (Paditës, I Paditur, Palë Kontraktuese).
  - Cito Nenet specifikisht: "Neni 45 i Kodit Civil parashikon..."
  - Strukturoje përgjigjen: [ANALIZA LIGJORE] -> [KONKLUZIONI] -> [KËSHILLA].
  `;

  const fileParts = files.map(file => ({
    inlineData: {
      mimeType: file.type,
      data: file.content 
    }
  }));

  const contents = [];

  history.forEach(msg => {
    if (msg.role === MessageRole.USER) {
      contents.push({ role: 'user', parts: [{ text: msg.text }] });
    } else if (msg.role === MessageRole.MODEL) {
      contents.push({ role: 'model', parts: [{ text: msg.text }] });
    }
  });

  const currentTurnParts: any[] = [...fileParts, { text: currentMessage }];
  
  contents.push({
    role: 'user',
    parts: currentTurnParts
  });

  try {
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    let fullText = '';
    for await (const chunk of result) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
    }
    return fullText;

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    if (error.message && (error.message.includes('token count') || error.message.includes('limit'))) {
        throw new Error("Keni kaluar limitin e informacionit. Ju lutem aktivizoni opsionin 'Auto-Analizë' që sistemi të zgjedhë vetëm ligjet e nevojshme.");
    }

    throw error;
  }
};