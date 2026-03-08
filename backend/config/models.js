export const MODELS = {
  coding: {
    id: 'qwen/qwen-3-coder-480b:free',
    name: 'Qwen 3 Coder 480B', shortName: 'QwenCoder',
    color: '#06b6d4', icon: '⚡', supportsTools: true,
    description: 'Specialized in 90+ languages',
    fallbacks: [
      { id: 'deepseek/deepseek-v3-0324:free', name: 'DeepSeek V3', shortName: 'DeepSeek V3', supportsTools: true },
      { id: 'qwen/qwq-32b:free',              name: 'QwQ 32B',     shortName: 'QwQ 32B',     supportsTools: true },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0', shortName: 'Gemini 2.0', supportsTools: true },
    ]
  },
  reasoning: {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1', shortName: 'DeepSeek R1',
    color: '#a78bfa', icon: '🧠', supportsTools: false,
    description: 'Chain of Thought reasoning',
    fallbacks: [
      { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 (May)', shortName: 'R1-0528', supportsTools: false },
      { id: 'qwen/qwq-32b:free',              name: 'QwQ 32B',           shortName: 'QwQ 32B', supportsTools: false },
      { id: 'deepseek/deepseek-v3-0324:free', name: 'DeepSeek V3',       shortName: 'DS V3',   supportsTools: false },
    ]
  },
  chat: {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B', shortName: 'Llama 3.3',
    color: '#34d399', icon: '💬', supportsTools: true,
    description: 'General purpose intelligence',
    fallbacks: [
      { id: 'google/gemma-3-27b-it:free',        name: 'Gemma 3 27B',   shortName: 'Gemma 27B',  supportsTools: true },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B',    shortName: 'Mistral 7B', supportsTools: false },
      { id: 'google/gemini-2.0-flash-exp:free',   name: 'Gemini 2.0',   shortName: 'Gemini 2.0', supportsTools: true },
    ]
  },
  longContext: {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash', shortName: 'Gemini 2.0',
    color: '#fbbf24', icon: '📄', supportsTools: true,
    description: '1M token context window',
    fallbacks: [
      { id: 'google/gemini-2.5-pro-exp-03-25:free', name: 'Gemini 2.5 Pro', shortName: 'Gemini 2.5', supportsTools: true },
      { id: 'deepseek/deepseek-v3-0324:free',       name: 'DeepSeek V3',    shortName: 'DS V3',      supportsTools: true },
    ]
  },
  creative: {
    id: 'arcee-ai/trinity-large-preview:free',
    name: 'Trinity Large', shortName: 'Trinity',
    color: '#f472b6', icon: '✍️', supportsTools: false,
    description: 'Fluid narrative writing',
    fallbacks: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', shortName: 'Llama 3.3', supportsTools: false },
      { id: 'google/gemma-3-27b-it:free',              name: 'Gemma 3 27B',   shortName: 'Gemma 27B', supportsTools: false },
    ]
  },
  speed: {
    id: 'stepfun/step-3.5-flash:free',
    name: 'Step 3.5 Flash', shortName: 'Step Flash',
    color: '#fb923c', icon: '⚡', supportsTools: false,
    description: 'Ultra-fast responses',
    fallbacks: [
      { id: 'google/gemma-3-12b-it:free',            name: 'Gemma 3 12B',  shortName: 'Gemma 12B',  supportsTools: false },
      { id: 'mistralai/mistral-7b-instruct:free',    name: 'Mistral 7B',   shortName: 'Mistral 7B', supportsTools: false },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3',   shortName: 'Llama 3.3',  supportsTools: false },
    ]
  }
};

export function getModelInfo(taskType) {
  return MODELS[taskType] || MODELS.chat;
}

export function getModelInfo(taskType) {
  return MODELS[taskType] || MODELS.chat;
}
