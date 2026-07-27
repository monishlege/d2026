import { create } from "zustand";

import type { ChatResponse, ConfidenceLevel, IntentType, LanguageCode } from "@/types";

interface AssistantState {
  selectedLanguage: LanguageCode;
  siteLanguage: "en" | "hi" | "kn";
  transcript: string;
  detectedIntent: IntentType | null;
  chatResult: ChatResponse | null;
  isProcessingVoice: boolean;
  quickPrompts: string[];
  setLanguage: (language: LanguageCode) => void;
  setSiteLanguage: (language: "en" | "hi" | "kn") => void;
  setTranscript: (value: string) => void;
  startVoiceProcessing: () => void;
  finishVoiceProcessing: (payload: {
    transcript: string;
    intent: IntentType;
    chatResult: ChatResponse;
  }) => void;
  resetChat: () => void;
}

const defaultQuickPrompts = [
  "Am I eligible for PM-KISAN if my annual income is 180000?",
  "Check whether this benefit link is safe before I open it.",
  "Fetch my verified income certificate from DigiLocker.",
];

export const confidenceActionMap: Record<ConfidenceLevel, string> = {
  high: "Auto",
  medium: "Clarify",
  low: "Escalate to Human Officer",
};

export const useAssistantStore = create<AssistantState>((set) => ({
  selectedLanguage: "hi",
  siteLanguage: "en",
  transcript: "",
  detectedIntent: null,
  chatResult: null,
  isProcessingVoice: false,
  quickPrompts: defaultQuickPrompts,
  setLanguage: (language) => set({ selectedLanguage: language }),
  setSiteLanguage: (language) => set({ siteLanguage: language }),
  setTranscript: (value) => set({ transcript: value }),
  startVoiceProcessing: () => set({ isProcessingVoice: true }),
  finishVoiceProcessing: ({ transcript, intent, chatResult }) =>
    set({
      transcript,
      detectedIntent: intent,
      chatResult,
      isProcessingVoice: false,
    }),
  resetChat: () =>
    set({
      transcript: "",
      detectedIntent: null,
      chatResult: null,
      isProcessingVoice: false,
    }),
}));
