import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWithEqualityFn } from 'zustand/traditional';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RootStackParamList } from '@navigation/AppNavigator';

export type FlowTarget =
  | 'registration'
  | 'questionnaire'
  | 'character'
  | 'step2Intro'
  | 'step2Questionnaire'
  | 'step2Results'
  | 'createAccount';

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
  questionIds?: number[];
  lastUpdated: number;
};

export type CharacterDraft = {
  params: RootStackParamList['Character'];
  lastUpdated: number;
};

export type Step2IntroDraft = {
  params: RootStackParamList['Step2Intro'];
  lastUpdated: number;
};

export type Step2QuestionnaireDraft = {
  answers: Record<string, 0 | 1>;
  index: number;
  params?: RootStackParamList['Step2Questionnaire'];
  lastUpdated: number;
};

export type Step2ResultsDraft = {
  params: RootStackParamList['Step2Results'];
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
  | { screen: 'Step2Intro'; params: RootStackParamList['Step2Intro'] }
  | { screen: 'Step2Questionnaire'; params: RootStackParamList['Step2Questionnaire'] }
  | { screen: 'Step2Results'; params: RootStackParamList['Step2Results'] }
  | { screen: 'CreateAccount'; params: RootStackParamList['CreateAccount'] };

type SessionState = {
  resumeTarget: FlowTarget | null;
  resumeDestination: ResumeDestination | null;
  registrationDraft: RegistrationDraft | null;
  questionnaireDraft: QuestionnaireDraft | null;
  characterDraft: CharacterDraft | null;
  step2IntroDraft: Step2IntroDraft | null;
  step2QuestionnaireDraft: Step2QuestionnaireDraft | null;
  step2ResultsDraft: Step2ResultsDraft | null;
  createAccountDraft: CreateAccountDraft | null;
  hydrated: boolean;
  setResumeTarget: (flow: FlowTarget | null) => void;
  setRegistrationDraft: (draft: Partial<RegistrationDraft>) => void;
  setQuestionnaireDraft: (draft: QuestionnaireDraft) => void;
  setCharacterDraft: (draft: CharacterDraft) => void;
  setStep2IntroDraft: (draft: Step2IntroDraft) => void;
  setStep2QuestionnaireDraft: (draft: Step2QuestionnaireDraft) => void;
  setStep2ResultsDraft: (draft: Step2ResultsDraft) => void;
  setCreateAccountDraft: (draft: CreateAccountDraft) => void;
  clearRegistrationDraft: () => void;
  clearQuestionnaireDraft: () => void;
  clearCharacterDraft: () => void;
  clearStep2IntroDraft: () => void;
  clearStep2QuestionnaireDraft: () => void;
  clearStep2ResultsDraft: () => void;
  clearCreateAccountDraft: () => void;
  clearAllDrafts: () => void;
  getResumeDestination: () => ResumeDestination | null;
};

const now = () => Date.now();

const priorityOrder: FlowTarget[] = [
  'createAccount',
  'step2Results',
  'step2Questionnaire',
  'step2Intro',
  'character',
  'questionnaire',
  'registration',
];

const computeResumeTarget = (
  state: Pick<
    SessionState,
    | 'registrationDraft'
    | 'questionnaireDraft'
    | 'characterDraft'
    | 'step2IntroDraft'
    | 'step2QuestionnaireDraft'
    | 'step2ResultsDraft'
    | 'createAccountDraft'
  >,
): FlowTarget | null => {
  for (const flow of priorityOrder) {
    switch (flow) {
      case 'createAccount':
        if (state.createAccountDraft?.params) return 'createAccount';
        break;
      case 'step2Questionnaire':
        if (state.step2QuestionnaireDraft?.params) return 'step2Questionnaire';
        break;
      case 'step2Results':
        if (state.step2ResultsDraft?.params) return 'step2Results';
        break;
      case 'step2Intro':
        if (state.step2IntroDraft?.params) return 'step2Intro';
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

const destinationsEqual = (a: ResumeDestination | null, b: ResumeDestination | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.screen !== b.screen) return false;
  const paramsA = JSON.stringify(a.params ?? {});
  const paramsB = JSON.stringify(b.params ?? {});
  return paramsA === paramsB;
};

const buildResumeDestination = (state: {
  resumeTarget: FlowTarget | null;
  registrationDraft: RegistrationDraft | null;
  questionnaireDraft: QuestionnaireDraft | null;
  characterDraft: CharacterDraft | null;
  step2IntroDraft: Step2IntroDraft | null;
  step2QuestionnaireDraft: Step2QuestionnaireDraft | null;
  step2ResultsDraft: Step2ResultsDraft | null;
  createAccountDraft: CreateAccountDraft | null;
}): ResumeDestination | null => {
  const ordered = state.resumeTarget
    ? [state.resumeTarget, ...priorityOrder.filter((p) => p !== state.resumeTarget)]
    : priorityOrder;

  for (const flow of ordered) {
    switch (flow) {
      case 'createAccount':
        if (state.createAccountDraft) {
          const rawParams = state.createAccountDraft.params;
          const form = state.createAccountDraft.form;
          const fallbackScores = rawParams?.scores ?? state.characterDraft?.params?.scores ?? {};
          const params =
            rawParams ??
            (form
              ? {
                  username: form.username,
                  email: form.email,
                  ageGroup: form.ageGroup,
                  gender: form.gender,
                  scores: fallbackScores,
                }
              : undefined);
          if (params) {
            return { screen: 'CreateAccount', params };
          }
        }
        break;
      case 'character':
        if (state.characterDraft?.params) {
          return { screen: 'Character', params: state.characterDraft.params };
        }
        break;
      case 'step2Intro':
        if (state.step2IntroDraft?.params) {
          return { screen: 'Step2Intro', params: state.step2IntroDraft.params };
        }
        break;
      case 'step2Questionnaire':
        if (state.step2QuestionnaireDraft?.params) {
          return { screen: 'Step2Questionnaire', params: state.step2QuestionnaireDraft.params };
        }
        break;
      case 'step2Results':
        if (state.step2ResultsDraft?.params) {
          return { screen: 'Step2Results', params: state.step2ResultsDraft.params };
        }
        break;
      case 'questionnaire':
        if (state.questionnaireDraft) {
          const params =
            state.questionnaireDraft.params ??
            (state.registrationDraft
              ? {
                  username: state.registrationDraft.username ?? '',
                  email: state.registrationDraft.email ?? '',
                  ageGroup: state.registrationDraft.ageGroup ?? '',
                  gender: state.registrationDraft.gender ?? '',
                }
              : undefined);
          if (params) {
            return { screen: 'Questionnaire', params };
          }
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

export const useSessionStore = createWithEqualityFn<SessionState>()(
  persist(
    (set, get) => ({
      resumeTarget: null,
      resumeDestination: null,
      hydrated: false,
      registrationDraft: null,
      questionnaireDraft: null,
      characterDraft: null,
      step2IntroDraft: null,
      step2QuestionnaireDraft: null,
      step2ResultsDraft: null,
      createAccountDraft: null,
      setResumeTarget: (flow) =>
        set((state) => {
          const nextTarget = flow ?? computeResumeTarget(state);
          const destination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          if (state.resumeTarget === nextTarget && destinationsEqual(state.resumeDestination, destination)) {
            return {};
          }
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
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: next,
              questionnaireDraft: state.questionnaireDraft,
              characterDraft: state.characterDraft,
              step2IntroDraft: state.step2IntroDraft,
              step2QuestionnaireDraft: state.step2QuestionnaireDraft,
              step2ResultsDraft: state.step2ResultsDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'registration';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: next,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
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
          const idsEqual =
            current?.questionIds &&
            draft.questionIds &&
            current.questionIds.length === draft.questionIds.length &&
            current.questionIds.every((id, idx) => id === draft.questionIds?.[idx]);
          if (answersEqual && indexEqual && paramsEqual && idsEqual) {
            return {};
          }
          const nextDraft: QuestionnaireDraft = {
            answers: draft.answers,
            index: draft.index,
            params: draft.params,
            questionIds: draft.questionIds ?? current?.questionIds ?? [],
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: nextDraft,
              characterDraft: state.characterDraft,
              step2IntroDraft: state.step2IntroDraft,
              step2QuestionnaireDraft: state.step2QuestionnaireDraft,
              step2ResultsDraft: state.step2ResultsDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'questionnaire';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: nextDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
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
              step2IntroDraft: state.step2IntroDraft,
              step2QuestionnaireDraft: state.step2QuestionnaireDraft,
              step2ResultsDraft: state.step2ResultsDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'character';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: nextDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return {
            characterDraft: nextDraft,
            resumeTarget,
            resumeDestination,
          };
        }),
      setStep2IntroDraft: (draft) =>
        set((state) => {
          const current = state.step2IntroDraft;
          const paramsEqual = JSON.stringify(current?.params ?? {}) === JSON.stringify(draft.params ?? {});
          if (paramsEqual) return {};
          const nextDraft: Step2IntroDraft = {
            params: draft.params,
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: state.questionnaireDraft,
              characterDraft: state.characterDraft,
              step2IntroDraft: nextDraft,
              step2QuestionnaireDraft: state.step2QuestionnaireDraft,
              step2ResultsDraft: state.step2ResultsDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'step2Intro';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: nextDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return {
            step2IntroDraft: nextDraft,
            resumeTarget,
            resumeDestination,
          };
        }),
      setStep2QuestionnaireDraft: (draft) =>
        set((state) => {
          const current = state.step2QuestionnaireDraft;
          const answersEqual = current && JSON.stringify(current.answers) === JSON.stringify(draft.answers);
          const indexEqual = current?.index === draft.index;
          const paramsEqual = JSON.stringify(current?.params ?? {}) === JSON.stringify(draft.params ?? {});
          if (answersEqual && indexEqual && paramsEqual) {
            return {};
          }
          const nextDraft: Step2QuestionnaireDraft = {
            answers: draft.answers,
            index: draft.index,
            params: draft.params,
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: state.questionnaireDraft,
              characterDraft: state.characterDraft,
              step2IntroDraft: state.step2IntroDraft,
              step2QuestionnaireDraft: nextDraft,
              step2ResultsDraft: state.step2ResultsDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'step2Questionnaire';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: nextDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return {
            step2QuestionnaireDraft: nextDraft,
            resumeTarget,
            resumeDestination,
          };
        }),
      setStep2ResultsDraft: (draft) =>
        set((state) => {
          const current = state.step2ResultsDraft;
          const paramsEqual = JSON.stringify(current?.params ?? {}) === JSON.stringify(draft.params ?? {});
          if (paramsEqual) return {};
          const nextDraft: Step2ResultsDraft = {
            params: draft.params,
            lastUpdated: now(),
          };
          const resumeTarget =
            computeResumeTarget({
              registrationDraft: state.registrationDraft,
              questionnaireDraft: state.questionnaireDraft,
              characterDraft: state.characterDraft,
              step2IntroDraft: state.step2IntroDraft,
              step2QuestionnaireDraft: state.step2QuestionnaireDraft,
              step2ResultsDraft: nextDraft,
              createAccountDraft: state.createAccountDraft,
            }) ?? 'step2Results';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: nextDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return {
            step2ResultsDraft: nextDraft,
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
              step2IntroDraft: state.step2IntroDraft,
              step2QuestionnaireDraft: state.step2QuestionnaireDraft,
              step2ResultsDraft: state.step2ResultsDraft,
              createAccountDraft: nextDraft,
            }) ?? 'createAccount';
          const resumeDestination = buildResumeDestination({
            resumeTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
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
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: null,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
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
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: null,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
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
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: null,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { characterDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearStep2IntroDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: null,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: null,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { step2IntroDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearStep2QuestionnaireDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: null,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: null,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          return { step2QuestionnaireDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearStep2ResultsDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: null,
            createAccountDraft: state.createAccountDraft,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: null,
            createAccountDraft: state.createAccountDraft,
          });
          return { step2ResultsDraft: null, resumeTarget: nextTarget, resumeDestination };
        }),
      clearCreateAccountDraft: () =>
        set((state) => {
          const nextTarget = computeResumeTarget({
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: null,
          });
          const resumeDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
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
          step2IntroDraft: null,
          step2QuestionnaireDraft: null,
          step2ResultsDraft: null,
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
        resumeDestination: state.resumeDestination,
        registrationDraft: state.registrationDraft,
        questionnaireDraft: state.questionnaireDraft,
        characterDraft: state.characterDraft,
        step2IntroDraft: state.step2IntroDraft,
        step2QuestionnaireDraft: state.step2QuestionnaireDraft,
        step2ResultsDraft: state.step2ResultsDraft,
        createAccountDraft: state.createAccountDraft,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!state) return;
        if (!error) {
          if (state.questionnaireDraft && !state.questionnaireDraft.questionIds) {
            state.questionnaireDraft.questionIds = [];
          }
          const nextTarget = state.resumeTarget ?? computeResumeTarget(state);
          const nextDestination = buildResumeDestination({
            resumeTarget: nextTarget,
            registrationDraft: state.registrationDraft,
            questionnaireDraft: state.questionnaireDraft,
            characterDraft: state.characterDraft,
            step2IntroDraft: state.step2IntroDraft,
            step2QuestionnaireDraft: state.step2QuestionnaireDraft,
            step2ResultsDraft: state.step2ResultsDraft,
            createAccountDraft: state.createAccountDraft,
          });
          state.resumeTarget = nextTarget;
          state.resumeDestination = nextDestination;
        }
        state.hydrated = true;
      },
    },
  ),
);
