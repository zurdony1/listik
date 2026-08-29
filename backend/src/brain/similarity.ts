export function similarity(
  firstText: string,
  secondText: string,
): number {
  const firstWords = new Set(
    firstText.split(" ").filter(Boolean),
  );

  const secondWords = new Set(
    secondText.split(" ").filter(Boolean),
  );

  if (
    firstWords.size === 0 ||
    secondWords.size === 0
  ) {
    return 0;
  }

  let matchingWords = 0;

  for (const word of firstWords) {
    if (secondWords.has(word)) {
      matchingWords++;
    }
  }

  const totalUniqueWords = new Set([
    ...firstWords,
    ...secondWords,
  ]).size;

  return matchingWords / totalUniqueWords;
}