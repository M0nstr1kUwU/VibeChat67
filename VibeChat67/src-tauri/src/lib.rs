use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run(){
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_message_table",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ];

    // Сборщик приложения
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
            // Связываем миграции с sql базой
                .add_migrations("sqlite:messenger.db", migrations)
                .build(),
        )
        // Создаём плагин opener из стандартного шаблона tauri
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("Ало да, тут сломалось крч...")
}