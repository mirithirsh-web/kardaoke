export function getMaestroWordBonus(wordCount: number): number {
  if (wordCount <= 0 || wordCount > 10) return 0;
  return 110 - wordCount * 10;
}

export function getMaestroBasePoints(correctSingerCount: number): number {
  return correctSingerCount * 10;
}

export function getSingerPoints(correct: boolean): number {
  return correct ? 15 : 0;
}
