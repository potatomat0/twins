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
  resumeDestination: ResumeDestination | null;
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

const buildResumeDestination = (state: {
  resumeTarget: FlowTarget | null;
  registrationDraft: RegistrationDraft | null;
  questionnaireDraft: QuestionnaireDraft | null;
  characterDraft: CharacterDraft | null;
  createAccountDraft: CreateAccountDraft | null;
}): ResumeDestination | null => {
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
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      resumeTarget: null,
      resumeDestination: null,
      registrationDraft: null,
      questionnaireDraft: null,
      characterDraft: null,
      createAccountDraft: null,
      setResumeTarget: (flow) =>
        set((state) => {
          const nextTarget = flow ?? computeResumeTarget(state);
          const destination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { resumeTarget: nextTarget, resumeDestination: destination };
        }),
      setRegistrationDraft: (draft) =>
        set((state) => {
          const current = state.registrationDraft;
          const next = {
            username: draft.username ?? current?.username ?? '',
            email: draft.email ?? current?.email ?? '',
            ageGroup: draft.ageGroup ?? current?.ageGroup ?? '',
            gender: draft.gender ?? current?.gender ?? '',
            lastUpdated: now(),
          } satisfies RegistrationDraft;
          if (
            current &&
            current.username === next.username &&
            current.email === next.email &&
            current.ageGroup === next.ageGroup &&
            current.gender === next.gender
          ) {
            return {};
          }
          const resumeTarget = computeResumeTarget({
            registrationDraft: next,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          }) ?? 'registration';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: next,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { registrationDraft: next, resumeTarget, resumeDestination };
        }),
      setQuestionnaireDraft: (draft) =>
        set((state) => {
          const current = state.questionnaireDraft;
          const answersEqual = current && JSON.stringify(current.answers) === JSON.stringify(draft.answers);
          const indexEqual = current?.index === draft.index;
          const paramsEqual = JSON.stringify(current?.params ?? {}) === JSON.stringify(draft.params ?? {});
          if (answersEqual && indexEqual && paramsEqual) {
            return {};
          }
          const nextDraft: QuestionnaireDraft = {
            answers: draft.answers,
            index: draft.index,
            params: draft.params,
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: nextDraft,
              characterDraft: state.characterDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'questionnaire';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: nextDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return {
            questionnaireDraft: nextDraft,
            resumeTarget,
            resumeDestination,
          };
        }),
      setCharacterDraft: (draft) =>
        set((state) => {
          const current = state.characterDraft;
          const paramsEqual = JSON.stringify(current?.params ?? {}) === JSON.stringify(draft.params ?? {});
          if (paramsEqual) return {};
          const nextDraft: CharacterDraft = {
            params: draft.params,
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: state.questionnaireDraft,
              characterDraft: nextDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'character';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: nextDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return {
            characterDraft: nextDraft,
            resumeTarget,
            resumeDestination,
          };
        }),
      setCreateAccountDraft: (draft) =>
        set((state) => {
          const current = state.createAccountDraft;
          const formEqual =
            current &&
            current.form.username === draft.form.username &&
            current.form.email === draft.form.email &&
            current.form.ageGroup === draft.form.ageGroup &&
            current.form.gender === draft.form.gender &&
            current.form.agreed === draft.form.agreed;
          const paramsEqual = JSON.stringify(current?.params ?? {}) === JSON.stringify(draft.params ?? {});
          if (formEqual && paramsEqual) return {};
          const nextDraft: CreateAccountDraft = {
            params: draft.params,
            form: draft.form,
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: state.questionnaireDraft,
              characterDraft: state.characterDraft,
              createAccountDraft: nextDraft,
            }) ?? 'createAccount';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: nextDraft,
          });
          return {
            createAccountDraft: nextDraft,
            resumeTarget,
            resumeDestination,
          };
        }),
      clearRegistrationDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: null,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: null,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { registrationDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearQuestionnaireDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: null,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: null,
            characterDraft: state.characterDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { questionnaireDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearCharacterDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: null,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: null,
            createAccountDraft: state.createAccountDraft,
          });
          return { characterDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearCreateAccountDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: null,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            createAccountDraft: null,
          });
          return { createAccountDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearAllDrafts: () =>
        set({
          resumeTarget: null,
          resumeDestination: null,
          registrationDraft: null,
          questionnaireDraft: null,
          characterDraft: null,
          createAccountDraft: null,
        }),
      getResumeDestination: () => get().resumeDestination,
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
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        const resumeTarget = state.resumeTarget ?? computeResumeTarget(state);
        const resumeDestination = buildResumeDestination({
          resumeTarget,
          registrationDraft: state.registrationDraft,
          questionnaireDraft: state.questionnaireDraft,
          characterDraft: state.characterDraft,
          createAccountDraft: state.createAccountDraft,
        });
        set(() => ({ resumeTarget, resumeDestination }));
      },
    },
  ),
);
