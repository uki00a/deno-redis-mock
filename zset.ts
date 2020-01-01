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
    return range(this.sortMembersByScoreASC(Array.from(this.members)), start, stop);
  }

  revrange(start: number, stop: number): string[] {
    return range(this.sortMembersByScoreDESC(Array.from(this.members)), start, stop);
  }

  rangeWithScores(start: number, stop: number): string[] {
    return this.range(start, stop).reduce((result, member) => {
      result.push(member);
      result.push(String(this.scores[member]));
      return result;
    }, [] as string[]);
  }

  revrangeWithScores(start: number, stop: number): string[] {
    return this.revrange(start, stop).reduce((result, member) => {
      result.push(member);
      result.push(String(this.scores[member]));
      return result;
    }, [] as string[]);
  }

  rangebyscore(min: number, max: number): string[] {
    return this.sortMembersByScoreASC(Array.from(this.members)
      .filter(x => {
        const score = this.scores[x];
        return min <= score && score <= max;
      }));
  }

  rangebyscoreWithScores(min: number, max: number): string[] {
    return this.rangebyscore(min, max).reduce((result, x) => {
      result.push(x);
      result.push(String(this.scores[x]));
      return result;
    }, [] as string[]);
  }

  revrangebyscore(max: number, min: number): string[] {
    return this.sortMembersByScoreDESC(Array.from(this.members)
      .filter(x => {
        const score = this.scores[x];
        return max >= score && score >= min;
      }));
  }

  revrangebyscoreWithScores(max: number, min: number): string[] {
    return this.revrangebyscore(max, min).reduce((result, x) => {
      result.push(x);
      result.push(String(this.scores[x]));
      return result;
    }, [] as string[]);
  }

  isEmpty(): boolean {
    return this.card() === 0;
  }

  private sortMembersByScoreASC(members: string[]): string[] {
    return members.sort((a, b) => {
      const scoreOfA = this.scores[a];
      const scoreOfB = this.scores[b];
      if (scoreOfA > scoreOfB) return 1;
      else if (scoreOfA < scoreOfB) return -1;
      else return a > b ? 1 : -1;
    });
  }

  private sortMembersByScoreDESC(members: string[]): string[] {
    return members.sort((a, b) => {
      const scoreOfA = this.scores[a];
      const scoreOfB = this.scores[b];
      if (scoreOfA > scoreOfB) return -1;
      else if (scoreOfA < scoreOfB) return 11;
      else return a > b ? -1 : 1;
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
