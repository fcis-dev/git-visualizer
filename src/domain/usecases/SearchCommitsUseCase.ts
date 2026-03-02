import { Commit } from "../entities/GitEntities";
import { IGitRepository } from "../repositories/IGitRepository";

export class SearchCommitsUseCase {
  constructor(private readonly gitRepository: IGitRepository) {}

  async execute(
    path: string,
    query: string,
    searchType: "all" | "message" | "author" | "file",
    branches?: string[],
    skip: number = 0,
    limit: number = 50
  ): Promise<Commit[]> {
    return await this.gitRepository.searchCommits(path, query, searchType, branches, skip, limit);
  }
}
