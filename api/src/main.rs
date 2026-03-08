use actix_web::{
    get, middleware::Logger, post, web, App, HttpRequest, HttpResponse, HttpServer, Result, http::header,
};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;
use sqlx::Row;
use log::error;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
struct DatabaseSettings {
    host: String,
    user: String,
    password: String,
    database: String,
    #[serde(default)]
    connection_limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct Settings {
    api_port: u16,
    token: String,
    base: String,
    host: String,
    database: DatabaseSettings,
}

// wrapper around shared state
struct AppState {
    config: Arc<Settings>,
    db: MySqlPool,
}

// helpers
fn check_auth(req: &HttpRequest, config: &Settings) -> bool {
    if let Some(header) = req.headers().get("authorization") {
        if let Ok(val) = header.to_str() {
            return val == config.token;
        }
    }
    false
}

#[derive(Serialize)]
struct EndpointList {
    code: u16,
    endpoints: Vec<&'static str>,
}

#[get("/")]
async fn index(data: web::Data<AppState>, req: HttpRequest) -> Result<HttpResponse> {
    if !check_auth(&req, &data.config) {
        return Ok(HttpResponse::Unauthorized()
            .json(serde_json::json!({"code":401, "message":"Unauthorized"})));
    }
    let list = EndpointList {
        code: 200,
        endpoints: vec!["get/", "add/", "delete/", "update/", "test/"],
    };
    Ok(HttpResponse::Ok().json(list))
}

#[derive(Serialize)]
struct ImageRecord {
    id: i64,
    filename: String,
    rating: i32,
    image: String,
    code: u16,
}

#[get("/get")]
async fn get_image(
    data: web::Data<AppState>,
    _req: HttpRequest,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse> {
    let rating: i32 = query
        .get("rating")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    // dynamic query (avoids compile-time macro errors when DATABASE_URL is absent)
    let row: Option<sqlx::mysql::MySqlRow> = match sqlx::query(
        "SELECT id, filename, rating FROM images WHERE rating = ? ORDER BY RAND() LIMIT 1",
    )
    .bind(rating)
    .fetch_optional(&data.db)
    .await
    {
        Ok(opt) => opt,
        Err(e) => {
            error!("query error: {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    if let Some(r) = row {
        let id: i64 = r.get("id");
        let filename: String = r.get("filename");
        let rating_val: i32 = r.get("rating");
        let image_url = format!(
            "{}/images/{}",
            data.config.host.trim_end_matches('/'),
            filename
        );
        let rec = ImageRecord {
            id,
            filename,
            rating: rating_val,
            image: image_url,
            code: 200,
        };
        Ok(HttpResponse::Ok().json(rec))
    } else {
        Ok(HttpResponse::NotFound().json(json!({"code":404, "message":"Image not found"})))
    }
}

#[derive(Deserialize)]
struct AddPayload {
    filename: String,
    status: Option<i32>,
}

#[post("/add")]
async fn add_image(
    data: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<AddPayload>,
) -> Result<HttpResponse> {
    if !check_auth(&req, &data.config) {
        return Ok(HttpResponse::Unauthorized()
            .json(serde_json::json!({"code":401, "message":"Unauthorized"})));
    }
    let status = body.status.unwrap_or(0);
    let filename = &body.filename;
    let res = sqlx::query("INSERT INTO images(filename, rating) VALUES (?, ?)")
        .bind(filename)
        .bind(status)
        .execute(&data.db)
        .await;
    match res {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({"code":200, "message":"Image added!"})))
        }
        Err(e) => {
            log::error!("insert error: {}", e);
            Ok(HttpResponse::InternalServerError()
                .json(serde_json::json!({"code":500, "message":"Failed to add image!"})))
        }
    }
}

#[derive(Deserialize)]
struct DeletePayload {
    id: i64,
}

#[post("/delete")]
async fn delete_image(
    data: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<DeletePayload>,
) -> Result<HttpResponse> {
    if !check_auth(&req, &data.config) {
        return Ok(HttpResponse::Unauthorized()
            .json(serde_json::json!({"code":401, "message":"Unauthorized"})));
    }
    let res = sqlx::query("DELETE FROM images WHERE id=?")
        .bind(body.id)
        .execute(&data.db)
        .await;
    match res {
        Ok(_) => Ok(
            HttpResponse::Ok().json(serde_json::json!({"code":200, "message":"Image deleted!"}))
        ),
        Err(e) => {
            log::error!("delete error: {}", e);
            Ok(HttpResponse::InternalServerError()
                .json(serde_json::json!({"code":500, "message":"Failed to delete image!"})))
        }
    }
}

#[derive(Deserialize)]
struct UpdatePayload {
    id: i64,
    filename: String,
    status: Option<i32>,
}

#[post("/update")]
async fn update_image(
    data: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<UpdatePayload>,
) -> Result<HttpResponse> {
    if !check_auth(&req, &data.config) {
        return Ok(HttpResponse::Unauthorized()
            .json(serde_json::json!({"code":401, "message":"Unauthorized"})));
    }
    let res = if let Some(r) = body.status {
        sqlx::query("UPDATE images SET filename=?, rating=? WHERE id=?")
            .bind(&body.filename)
            .bind(r)
            .bind(body.id)
            .execute(&data.db)
            .await
    } else {
        sqlx::query("UPDATE images SET filename=? WHERE id=?")
            .bind(&body.filename)
            .bind(body.id)
            .execute(&data.db)
            .await
    };
    match res {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({"code":200, "message":"AD updated"})))
        }
        Err(e) => {
            log::error!("update error: {}", e);
            Ok(HttpResponse::InternalServerError()
                .json(serde_json::json!({"code":500, "message":"Failed to update AD!"})))
        }
    }
}

#[get("/test")]
async fn get_test() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({"code":200})))
}

#[post("/test")]
async fn post_test(body: web::Json<serde_json::Value>) -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({"code":200, "data": *body})))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init();

    // build configuration using the new builder API instead of the deprecated `merge`
    let settings = config::Config::builder()
        // read from settings.toml if exists
        .add_source(config::File::with_name("config/settings").required(false))
        .add_source(config::Environment::with_prefix("MONIKA").separator("__"))
        .build()
        .unwrap();
    let config: Settings = settings
        .try_deserialize()
        .expect("failed to load configuration");
    let database_url = format!(
        "mysql://{}:{}@{}/{}",
        config.database.user,
        config.database.password,
        config.database.host,
        config.database.database,
    );
    let pool = MySqlPoolOptions::new()
        .max_connections(config.database.connection_limit.unwrap_or(5))
        .connect(&database_url)
        .await
        .expect("failed to connect to database");

    let state = web::Data::new(AppState {
        config: Arc::new(config),
        db: pool,
    });
    let listen_addr = format!("0.0.0.0:{}", state.config.api_port);
    log::info!("starting api on {}", listen_addr);
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
            .allowed_header(header::CONTENT_TYPE)
            .max_age(3600);
        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(state.clone())
            .service(
                web::scope(&state.config.base)
                    .service(index)
                    .service(get_image)
                    .service(add_image)
                    .service(delete_image)
                    .service(update_image)
                    .service(get_test)
                    .service(post_test),
            )
    })
    .bind(listen_addr)?
    .run()
    .await
}
