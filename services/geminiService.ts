
import { GoogleGenAI, Type } from "@google/genai";
import { OperatorSuggestion } from "../types";

const getClient = () => {
  const apiKey = localStorage.getItem('maa_gemini_api_key');
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Fetches operator replacement suggestions from Gemini.
 */
export const getOperatorSuggestions = async (
  operatorName: string, 
  stageName?: string
): Promise<OperatorSuggestion[]> => {
  try {
    const ai = getClient();

    const prompt = `In the game Arknights, recommend 3 alternative operators that can replace "${operatorName}" ${stageName ? `for the stage "${stageName}"` : ""}. Provide the operator name (Korean) and a brief reason (in Korean). Return the result in a JSON array format.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "The name of the suggested operator in Korean",
              },
              reason: {
                type: Type.STRING,
                description: "Brief explanation of why this operator is a good replacement (in Korean)",
              },
            },
            required: ["name", "reason"],
          },
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      return [];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON response:", parseError);
      return [];
    }
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") {
        throw error;
    }
    console.error("Gemini API Error:", error);
    return [];
  }
};

/**
 * Translates the given text to Korean using Gemini.
 */
export const translateToKorean = async (text: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Truncate if too long to save tokens
    const safeText = text.slice(0, 2000);

    const prompt = `Translate the following Arknights strategy description into natural Korean.
    
Rules:
1. Output ONLY the translated text. 
2. Do NOT include any introductory phrases, notes, glossaries, or the original text.
3. Keep Arknights terminology accurate (Korean server terms).

Text to translate:
${safeText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "번역을 가져올 수 없습니다.";
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") {
      throw error;
    }
    console.error("Translation Error:", error);
    throw new Error("번역 중 오류가 발생했습니다.");
  }
};

/**
 * Batch translates operator names.
 * Input: Map of { id: { cnName, appellation } }
 */
export const translateOperatorNames = async (
    targetOps: { id: string, cnName?: string, appellation?: string }[]
): Promise<Record<string, string>> => {
    try {
        const ai = getClient();
        
        // Prepare detailed input list for the prompt
        const inputList = targetOps.map(op => ({
            id: op.id,
            cn: op.cnName || '',
            en: op.appellation || ''
        }));
        
        const prompt = `
        You are a localization expert for the game Arknights (Korean Server).
        Your task is to translate the provided list of Operator names into **Official Korean Names (Hangul)**.

        **CRITICAL TRANSLATION RULES:**
        1. **IGNORE Chinese Meaning:** Do NOT translate the meaning of the Chinese characters.
        2. **USE English Phonetics (Transliteration):** In 95% of cases, the Korean name is a direct phonetic transliteration of the **English Name (Appellation)**.
        3. **Namu Wiki Style:** Use the standard naming convention found on Namu Wiki.

        **EXAMPLES (Do exactly like this):**
        - CN: 澄闪 / EN: Goldenglow -> **골든글로우**
        - CN: 号角 / EN: Horn -> **혼**
        - CN: 提丰 / EN: Typhon -> **티폰**
        - CN: 玛恩纳 / EN: Młynar -> **무에나**
        - CN: 鸿雪 / EN: Pozyomka -> **파죠무카**
        - CN: 维什戴尔 / EN: Wis'adel -> **위셜델**
        - CN: 逻各斯 / EN: Logos -> **로고스**
        - CN: 佩佩 / EN: Pepe -> **페페**
        
        **EXCEPTIONS (Yan/Sui Characters):**
        - CN: 重岳 / EN: Chongyue -> **총웨**
        - CN: 黍 / EN: Shu -> **슈**
        - CN: 左乐 / EN: Zuo Le -> **쭤러**

        **Input Data:**
        ${JSON.stringify(inputList)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: "List of translated operator names",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            koreanName: { type: Type.STRING }
                        },
                        required: ["id", "koreanName"]
                    }
                }
            }
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) return {};
        
        // Parse the array and convert to Record<id, name>
        const resultArr = JSON.parse(jsonStr) as { id: string, koreanName: string }[];
        const resultMap: Record<string, string> = {};
        resultArr.forEach(item => {
            if (item.id && item.koreanName) {
                resultMap[item.id] = item.koreanName;
            }
        });

        return resultMap;

    } catch (error: any) {
        if (error.message === "API_KEY_MISSING") throw error;
        console.error("Batch Translation Error:", error);
        throw error;
    }
};
