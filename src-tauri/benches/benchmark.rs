use tauri_appgit_visualizer_lib::services::*;
use std::time::Instant;

fn main() {
    let path = "benches/log";
    let query = "a";
    let search_type = "all";
    let branches: Option<Vec<String>> = None;
    let skip = 0;
    let limit = 100;

    let mut times = vec![];
    for _ in 0..5 {
        let start = Instant::now();
        let result = search_commits(path, query, search_type, branches.clone(), skip, limit);
        times.push(start.elapsed().as_millis());
        if let Ok(commits) = result {
            println!("Found {} commits", commits.len());
        }
    }
    println!("Times: {:?}", times);
}
