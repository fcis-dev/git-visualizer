use criterion::{criterion_group, criterion_main, Criterion};
use std::fs;
use std::process::Command;
use tauri_appgit_visualizer_lib::services::git_discard_changes;
use tempfile::TempDir;

fn setup_repo(num_files: usize) -> (TempDir, Vec<String>) {
    let dir = TempDir::new().unwrap();
    let path = dir.path();

    // Init git repo
    Command::new("git")
        .arg("init")
        .current_dir(path)
        .output()
        .unwrap();

    let mut files = Vec::new();
    // Create new files
    for i in 0..num_files {
        let file_name = format!("file_{}.txt", i);
        let file_path = path.join(&file_name);
        fs::write(&file_path, "content").unwrap();
        files.push(file_name);
    }

    (dir, files)
}

fn bench_git_discard_changes(c: &mut Criterion) {
    let mut group = c.benchmark_group("git_discard");

    // Benchmark discarding 500 new untracked files
    group.bench_function("discard_500_untracked", |b| {
        b.iter_with_setup(
            || setup_repo(500),
            |(dir, files)| {
                git_discard_changes(dir.path().to_str().unwrap(), files).unwrap();
            },
        );
    });

    group.finish();
}

criterion_group!(benches, bench_git_discard_changes);
criterion_main!(benches);
