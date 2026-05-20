import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";
import { SourceControlUseCases } from "../../domain/usecases/SourceControlUseCases";
import { ExecuteGitActionUseCase } from "../../domain/usecases/ExecuteGitActionUseCase";

// Concrete Data Implementation (Infrastructure)
const gitRepository = new TauriGitRepository();

// Domain Use Cases (Interactors)
export const sourceControlUseCases = new SourceControlUseCases(gitRepository);
export const executeGitActionUseCase = new ExecuteGitActionUseCase(gitRepository);

// Exporting the repository interface if needed directly for simple reads
export const repository = gitRepository;
