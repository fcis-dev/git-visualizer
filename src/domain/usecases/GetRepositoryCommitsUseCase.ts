import { Commit, InitialRepoData } from "../entities/GitEntities";
import { IGitRepository } from "../repositories/IGitRepository";

export class GetRepositoryCommitsUseCase {
  constructor(private readonly gitRepository: IGitRepository) {}

  async executeInitialLoad(
    path: string,
    skip: number = 0,
    limit: number = 150,
    branches?: string[]
  ): Promise<InitialRepoData> {
    return await this.gitRepository.getInitialRepoData(path, skip, limit, branches);
  }

  async executeLoadMore(
    path: string,
    skip: number,
    limit: number,
    branches?: string[]
  ): Promise<Commit[]> {
    return await this.gitRepository.getCommits(path, skip, limit, branches);
  }
}
