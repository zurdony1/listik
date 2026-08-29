export interface BrainScoreInput {
  codeMatched: boolean;
  nameConfidence: number;
  previousMemories: number;
  sameStore: boolean;
  confirmedByHuman: boolean;
}

export function calculateBrainScore(
  input: BrainScoreInput,
): number {
  let score = 0;

  if (input.codeMatched) {
    score += 45;
  }

  score +=
    Math.max(
      0,
      Math.min(input.nameConfidence, 100),
    ) * 0.2;

  score += Math.min(
    input.previousMemories,
    15,
  );

  if (input.sameStore) {
    score += 10;
  }

  if (input.confirmedByHuman) {
    score += 10;
  }

  return Math.min(
    100,
    Math.round(score),
  );
}