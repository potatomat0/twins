import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RootStackParamList } from '@navigation/AppNavigator';

export type FlowTarget = 'registration' | 'questionnaire' | 'character' | 'createAccount';

export type RegistrationDraft = {
  username: string;
  email: string;
  ageGroup: string;
  gender: string;
  lastUpdated: number;
};

export type QuestionnaireDraft = {
  answers: Record<number, 1 | 2 | 3 | 4 | 5>;
  index: number;
  params?: RootStackParamList['Questionnaire'];
  lastUpdated: number;
};

export type CharacterDraft = {
  params: RootStackParamList['Character'];
  lastUpdated: number;
};

export type CreateAccountDraft = {
  params?: RootStackParamList['CreateAccount'];
  form: {
    username: string;
    email: string;
    ageGroup: string;
    gender: string;
    agreed: boolean;
  };
  lastUpdated: number;
};

export type ResumeDestination =
  | { screen: 'Registration'; params?: RootStackParamList['Registration'] }
  | { screen: 'Questionnaire'; params?: RootStackParamList['Questionnaire'] }
  | { screen: 'Character'; params: RootStackParamList['Character'] }
  | { screen: 'CreateAccount'; params: RootStackParamList['CreateAccount'] };

type SessionState = {
  resumeTarget: FlowTarget | null;
  registrationDraft: RegistrationDraft | null;
  questionnaireDraft: QuestionnaireDraft | null;
  characterDraft: CharacterDraft | null;
  createAccountDraft: CreateAccountDraft | null;
  setResumeTarget: (flow: FlowTarget | null) => void;
  setRegistrationDraft: (draft: Partial<RegistrationDraft>) => void;
  setQuestionnaireDraft: (draft: QuestionnaireDraft) => void;
  setCharacterDraft: (draft: CharacterDraft) => void;
  setCreateAccountDraft: (draft: CreateAccountDraft) => void;
  clearRegistrationDraft: () => void;
  clearQuestionnaireDraft: () => void;
  clearCharacterDraft: () => void;
  clearCreateAccountDraft: () => void;
  clearAllDrafts: () => void;
  getResumeDestination: () => ResumeDestination | null;
};

const now = () => Date.now();

const priorityOrder: FlowTarget[] = ['createAccount', 'character', 'questionnaire', 'registration'];

const computeResumeTarget = (state: Pick<SessionState, 'registrationDraft' | 'questionnaireDraft' | 'characterDraft' | 'createAccountDraft'>): FlowTarget | null => {
  for (const flow of priorityOrder) {
    switch (flow) {
      case 'createAccount':
        if (state.createAccountDraft?.params) return 'createAccount';
        break;
      case 'character':
        if (state.characterDraft?.params) return 'character';
        break;
      case 'questionnaire':
        if (state.questionnaireDraft?.params) return 'questionnaire';
        break;
      case 'registration':
        if (state.registrationDraft) return 'registration';
        break;
      default:
        break;
    }
  }
  return null;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      resumeTarget: null,
      registrationDraft: null,
      questionnaireDraft: null,
      characterDraft: null,
      createAccountDraft: null,
      setResumeTarget: (flow) => set({ resumeTarget: flow }),
      setRegistrationDraft: (draft) =>
        set((state) => ({
          resumeTarget: 'registration',
          registrationDraft: {
            username: draft.username ?? state.registrationDraft?.username ?? '',
            email: draft.email ?? state.registrationDraft?.email ?? '',
            ageGroup: draft.ageGroup ?? state.registrationDraft?.ageGroup ?? '',
            gender: draft.gender ?? state.registrationDraft?.gender ?? '',
            lastUpdated: now(),
          },
        })),
      setQuestionnaireDraft: (draft) =>
        set(() => ({
          resumeTarget: 'questionnaire',
          questionnaireDraft: {
            answers: draft.answers,
            index: draft.index,
            params: draft.params,
            lastUpdated: now(),
          },
        })),
      setCharacterDraft: (draft) =>
        set(() => ({
          resumeTarget: 'character',
          characterDraft: {
            params: draft.params,
            lastUpdated: now(),
          },
        })),
      setCreateAccountDraft: (draft) =>
        set(() => ({
          resumeTarget: 'createAccount',
          createAccountDraft: {
            params: draft.params,
            form: draft.form,
            lastUpdated: now(),
          },
        })),
      clearRegistrationDraft: () =>
        set((state) => {
          const next = computeResumeTarget({
            registrationDraft: null,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { registrationDraft: null, resumeTarget: next };
        }),
      clearQuestionnaireDraft: () =>
        set((state) => {
          const next = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: null,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { questionnaireDraft: null, resumeTarget: next };
        }),
      clearCharacterDraft: () =>
        set((state) => {
          const next = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: null,
            createAccountDraft: state.createAccountDraft,
          });
          return { characterDraft: null, resumeTarget: next };
        }),
      clearCreateAccountDraft: () =>
        set((state) => {
          const next = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: null,
          });
          return { createAccountDraft: null, resumeTarget: next };
        }),
      clearAllDrafts: () =>
        set({
          resumeTarget: null,
          registrationDraft: null,
          questionnaireDraft: null,
          characterDraft: null,
          createAccountDraft: null,
        }),
      getResumeDestination: () => {
        const state = get();
        const ordered = state.resumeTarget
          ? [state.resumeTarget, ...priorityOrder.filter((p) => p !== state.resumeTarget)]
          : priorityOrder;

        for (const flow of ordered) {
          switch (flow) {
            case 'createAccount':
              if (state.createAccountDraft?.params) {
                return { screen: 'CreateAccount', params: state.createAccountDraft.params };
              }
              break;
            case 'character':
              if (state.characterDraft?.params) {
                return { screen: 'Character', params: state.characterDraft.params };
              }
              break;
            case 'questionnaire':
              if (state.questionnaireDraft?.params) {
                return { screen: 'Questionnaire', params: state.questionnaireDraft.params };
              }
              break;
            case 'registration':
              if (state.registrationDraft) {
                return { screen: 'Registration' };
              }
              break;
            default:
              break;
          }
        }
        return null;
      },
    }),
    {
      name: 'twins-session-cache',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        resumeTarget: state.resumeTarget,
        registrationDraft: state.registrationDraft,
        questionnaireDraft: state.questionnaireDraft,
        characterDraft: state.characterDraft,
        createAccountDraft: state.createAccountDraft,
      }),
    },
  ),
);
