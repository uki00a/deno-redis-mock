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
    const scores = unique(Object.values(this.scores)).sort((a, b) => a - b);
    const rankByScore = scores.reduce((rankByScore, score, index) => {
      rankByScore[score] = index;
      return rankByScore;
    }, {} as { [score: string]: number });
    const score = this.scores[member];
    return rankByScore[score];
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

  isEmpty(): boolean {
    return this.card() === 0;
  }
}

function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}
