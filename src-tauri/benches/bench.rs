use criterion::{black_box, criterion_group, criterion_main, Criterion};
use std::fs;
use std::path::Path;
// Use the lib name from Cargo.toml
use tauri_appgit_visualizer_lib::services::get_repos_in_folder;

fn bench_get_repos_in_folder(c: &mut Criterion) {
    let test_dir = "/tmp/bench_git_repos";

    // Setup some dummy repos
    let _ = fs::create_dir_all(test_dir);
    for i in 0..100 {
        let repo_path = Path::new(test_dir).join(format!("repo_{}", i));
        let _ = fs::create_dir_all(repo_path.join(".git"));
    }

    c.bench_function("get_repos_in_folder", |b| {
        b.iter(|| get_repos_in_folder(black_box(test_dir)))
    });

    // Teardown
    let _ = fs::remove_dir_all(test_dir);
}

criterion_group!(benches, bench_get_repos_in_folder);
criterion_main!(benches);
