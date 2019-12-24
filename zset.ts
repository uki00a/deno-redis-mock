import { range } from './helpers.ts';

export class ZSet {
  private readonly members = new Set<string>();
  private readonly scores = {} as { [member: string]: number };

  add(score: number, member: string): void {
    this.members.add(member);
    this.scores[member] = score;
  }

  card(): number {
    return this.members.size;
  }

  score(member: string): number {
    return this.scores[member];
  }

  rank(member: string): number {
    return this.computeRank(member, (a, b) => a - b);
  }

  revrank(member: string): number {
    return this.computeRank(member, (a, b) => b - a);
  }

  incrby(increment: number, member: string): number {
    if (!this.members.has(member)) {
      this.add(increment, member);
    } else {
      this.scores[member] += increment;
    }
    return this.scores[member];
  }

  rem(...members: string[]): number {
    const origSize = this.members.size;

    members.forEach(x => {
      this.members.delete(x);
      delete this.scores[x];
    });

    const currentSize = this.members.size;
    const numberOfRemovedMembers = origSize - currentSize;
    return numberOfRemovedMembers;
  }

  range(start: number, stop: number): string[] {
    return range(this.sortedByScoreASC(), start, stop);
  }

  rangeWithScores(start: number, stop: number): string[] {
    return this.range(start, stop).reduce((result, member) => {
      result.push(member);
      result.push(String(this.scores[member]));
      return result;
    }, [] as string[]);
  }

  isEmpty(): boolean {
    return this.card() === 0;
  }

  private sortedByScoreASC(): string[] {
    return Array.from(this.members).sort((a, b) => {
      const scoreOfA = this.scores[a];
      const scoreOfB = this.scores[b];
      if (scoreOfA > scoreOfB) return 1;
      else if (scoreOfA < scoreOfB) return -1;
      else return a > b ? 1 : -1;
    });
  }

  private computeRank(member: string, scoreComparator: (a: number, b: number) => number): number {
    const scores = unique(Object.values(this.scores)).sort(scoreComparator);
    const rankByScore = scores.reduce((rankByScore, score, index) => {
      rankByScore[score] = index;
      return rankByScore;
    }, {} as { [score: string]: number });
    const score = this.scores[member];
    return rankByScore[score];
  }
}

function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}
