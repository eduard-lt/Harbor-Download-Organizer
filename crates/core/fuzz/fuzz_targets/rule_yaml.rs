#![no_main]

use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Fuzz YAML/JSON deserialization of Rule structs.
    // Rules are the primary user-facing config — must never panic.
    if let Ok(s) = std::str::from_utf8(data) {
        let _ = serde_yaml::from_str::<harbor_core::types::Rule>(s);
        let _ = serde_json::from_str::<harbor_core::types::Rule>(s);
    }
});
