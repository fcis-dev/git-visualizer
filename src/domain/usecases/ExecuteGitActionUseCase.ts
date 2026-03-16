import { IGitRepository } from "../repositories/IGitRepository";

export class ExecuteGitActionUseCase {
  constructor(private readonly gitRepository: IGitRepository) {}

  async checkoutCommit(path: string, hash: string): Promise<void> {
    return await this.gitRepository.checkoutCommit(path, hash);
  }

  async checkoutBranch(path: string, branch: string): Promise<void> {
    return await this.gitRepository.checkoutBranch(path, branch);
  }

  async fetch(path: string): Promise<void> {
    return await this.gitRepository.fetch(path);
  }

  async pull(path: string): Promise<void> {
      return await this.gitRepository.pull(path);
  }

  async push(path: string): Promise<void> {
      return await this.gitRepository.push(path);
  }

  async reset(path: string, hash: string, mode: "soft" | "mixed" | "hard"): Promise<void> {
    return await this.gitRepository.reset(path, hash, mode);
  }

  async rebase(path: string, branch: string): Promise<void> {
    return await this.gitRepository.rebase(path, branch);
  }

  async cherryPick(path: string, hash: string): Promise<void> {
    return await this.gitRepository.cherryPick(path, hash);
  }

  async revert(path: string, hash: string): Promise<void> {
    return await this.gitRepository.revert(path, hash);
  }

  async merge(path: string, branch: string): Promise<void> {
    return await this.gitRepository.merge(path, branch);
  }

  async createTag(path: string, name: string, hash?: string): Promise<void> {
    return await this.gitRepository.createTag(path, name, hash);
  }

  async createBranch(path: string, name: string, hash: string): Promise<void> {
    return await this.gitRepository.createBranch(path, name, hash);
  }

  async deleteBranch(path: string, name: string, force: boolean = false): Promise<void> {
    return await this.gitRepository.deleteBranch(path, name, force);
  }

  async deleteBranchRemote(path: string, remote: string, name: string): Promise<void> {
    return await this.gitRepository.deleteBranchRemote(path, remote, name);
  }
}
