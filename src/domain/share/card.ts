export type ShareCardCopy = {
  headline: string;
  lines: string[];
  challenge: string;
  brand: string;
};

export function shareCardCopy(input: {
  choiceCount: number;
  predictedPct: number | null;
  crowdPct: number | null;
  accuracy: number;
}): ShareCardCopy {
  if (
    input.choiceCount === 2 &&
    input.predictedPct != null &&
    input.crowdPct != null
  ) {
    const predicted = Math.round(input.predictedPct);
    const crowd = Math.round(input.crowdPct);
    const off = Math.abs(predicted - crowd);
    return {
      headline: "☁️ I CALLED THE CROWD",
      lines: [
        `My prediction: ${predicted}%`,
        `The crowd: ${crowd}%`,
        off === 1 ? "1 point off" : `${off} points off`,
        `Accuracy ${input.accuracy}`,
      ],
      challenge: "Think you know the crowd better?",
      brand: "MARSHMALLOW",
    };
  }

  return {
    headline: `☁️ ACCURACY ${input.accuracy}`,
    lines: ["I predicted the crowd."],
    challenge: "Think you can do better?",
    brand: "MARSHMALLOW",
  };
}

export function shortenQuestion(question: string, max = 96): string {
  const trimmed = question.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
