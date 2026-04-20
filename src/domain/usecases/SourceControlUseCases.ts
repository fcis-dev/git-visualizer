import { IGitRepository } from "../repositories/IGitRepository";

export class SourceControlUseCases {
  constructor(private repository: IGitRepository) {}

  async stageFiles(path: string, files: string[]): Promise<void> {
    return await this.repository.stageFiles(path, files);
  }

  async unstageFiles(path: string, files: string[]): Promise<void> {
    return await this.repository.unstageFiles(path, files);
  }

  async discardChanges(path: string, files: string[]): Promise<void> {
    return await this.repository.discardChanges(path, files);
  }

  async commit(path: string, message: string, noVerify?: boolean): Promise<void> {
    return await this.repository.commit(path, message, noVerify);
  }

  async commitAmend(path: string, message: string): Promise<void> {
    return await this.repository.commitAmend(path, message);
  }

  async stashSave(path: string, message?: string): Promise<void> {
    return await this.repository.stashSave(path, message);
  }

  async resolveConflict(path: string, file: string, strategy: 'ours' | 'theirs'): Promise<void> {
    return await this.repository.resolveConflict(path, file, strategy);
  }

  async rebaseAbort(path: string): Promise<void> {
    return await this.repository.rebaseAbort(path);
  }

  async rebaseContinue(path: string): Promise<void> {
    return await this.repository.rebaseContinue(path);
  }
}
