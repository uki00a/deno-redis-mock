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

  incrby(increment: number, member: string): number {
    if (!this.members.has(member)) {
      this.add(increment, member);
    } else {
      this.scores[member] += increment;
    }
    return this.scores[member];
  }
}

