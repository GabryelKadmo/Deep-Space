export const LEADER_DICTATION_COMMAND = 'deepspace:leader-dictation';
export const LEADER_DICTATION_STATE = 'deepspace:leader-dictation-state';

export type LeaderDictationStatus = 'idle' | 'recording' | 'transcribing';

export type LeaderDictationCommandDetail = {
  nodeId: string;
};

export type LeaderDictationStateDetail = LeaderDictationCommandDetail & {
  status: LeaderDictationStatus;
};
