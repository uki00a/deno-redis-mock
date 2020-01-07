import { range, take } from './helpers.ts';

interface LimitOptions {
  offset?: number;
  count?: number;
}

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
    const members = this.sortMembersByScoreASC(Array.from(this.members));
    const rank = members.indexOf(member);
    return rank === -1 ? undefined : rank;
  }

  revrank(member: string): number {
    const members = this.sortMembersByScoreDESC(Array.from(this.members));
    const rank = members.indexOf(member);
    return rank === -1 ? undefined : rank;
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

  popmax(count?: number): string[] {
    const toPop = take(this.sortMembersByScoreDESC(Array.from(this.members)), count == null ? 1 : count);
    return this.pop(toPop);
  }

  popmin(count?: number): string[] {
    const toPop = take(this.sortMembersByScoreASC(Array.from(this.members)), count == null ? 1 : count);
    return this.pop(toPop);
  }

  remrangebyrank(start: number, stop: number): number {
    const range = this.rangebyrank(start, stop);
    return this.rem(...range);
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

  rangebyscore(min: number, max: number, options?: LimitOptions): string[] {
    const result = this.sortMembersByScoreASC(Array.from(this.members)
      .filter(x => {
        const score = this.scores[x];
        return min <= score && score <= max;
      }));

    return applyLimitIfNeeded(result, options);
  }

  private rangebyrank(start: number, stop: number): string[] {
    const members = Array.from(this.members);
    const rankByMember = members.reduce((rankByMember, member) => {
      rankByMember[member] = this.rank(member);
      return rankByMember;
    }, {} as { [member: string]: number });

    start = start < 0 ? members.length + start : start;
    stop = stop < 0 ? members.length + stop : stop;

    return members.filter(x => {
      const rank = rankByMember[x];
      return start <= rank && rank <= stop;
    });
  }

  rangebyscoreWithScores(min: number, max: number, options?: LimitOptions): string[] {
    return this.rangebyscore(min, max, options).reduce((result, x) => {
      result.push(x);
      result.push(String(this.scores[x]));
      return result;
    }, [] as string[]);
  }

  revrangebyscore(max: number, min: number, options?: LimitOptions): string[] {
    const result = this.sortMembersByScoreDESC(Array.from(this.members)
      .filter(x => {
        const score = this.scores[x];
        return max >= score && score >= min;
      }));

    return applyLimitIfNeeded(result, options);
  }

  revrangebyscoreWithScores(max: number, min: number, options?: LimitOptions): string[] {
    return this.revrangebyscore(max, min, options).reduce((result, x) => {
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

  private pop(membersToPop: string[]): string[] {
    const result = membersToPop.reduce((result, member) => {
      result.push(member);
      result.push(String(this.scores[member]));
      return result;
    }, [] as string[]);
    this.rem(...membersToPop);
    return result;
  }
}

function applyLimitIfNeeded(values: string[], options?: LimitOptions): string[] {
  if (options && options.offset != null && options.count != null) {
    return applyLimit(values, options);
  } else {
    return values;
  }
}

function applyLimit(values: string[], options: LimitOptions): string[] {
  const { offset, count } = options;
  return values.slice(offset, count > 0 ? offset + count : undefined)
}

function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}
