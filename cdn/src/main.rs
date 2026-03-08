use actix_files::NamedFile;
use actix_web::{
    delete, get, middleware::Logger, post, web, App, HttpRequest, HttpResponse, HttpServer, Result,
};
use serde::Deserialize;
use serde_json::json;
use log::{error};
use std::path::Path;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
struct Settings {
    cdn_port: u16,
    location: String,
    token: String,
}

struct AppState {
    config: Arc<Settings>,
}

fn check_auth(req: &HttpRequest, config: &Settings) -> bool {
    if let Some(header) = req.headers().get("authorization") {
        if let Ok(val) = header.to_str() {
            return val == config.token;
        }
    }
    false
}

// simple helper to sanitize file names
fn allowed_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map_or(false, |ext| {
            matches!(
                ext.to_lowercase().as_str(),
                "jpg" | "jpeg" | "png" | "gif" | "mp4"
            )
        })
}

#[get("/images/{image:.*}")]
async fn serve_image(
    data: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let image_str = path.into_inner();
    let image = Path::new(&image_str);
    if image == Path::new("") || !allowed_extension(image) {
        return Ok(HttpResponse::BadRequest().json(json!({"code":400, "message":"Invalid arguments"})));

    }
    let file_path = Path::new(&data.config.location).join(image);
    if file_path.exists() && file_path.is_file() {
        Ok(NamedFile::open(file_path)?.into_response(&req))
    } else {
        Ok(HttpResponse::NotFound().json(json!({"code":404, "message":"Not found"})))
    }
}

#[derive(Deserialize)]
struct DownloadPayload {
    url: String,
    filename: Option<String>,
}

#[post("/images")]
async fn download_image(
    data: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<DownloadPayload>,
) -> Result<HttpResponse> {
    if !check_auth(&req, &data.config) {
        return Ok(HttpResponse::Unauthorized()
            .json(serde_json::json!({"code":401, "message":"Unauthorized"})));
    }
    let url = &body.url;
    let filename = body
        .filename
        .clone()
        .unwrap_or_else(|| url.split('/').last().unwrap_or_default().to_string());
    let path = Path::new(&data.config.location).join(&filename);
    // simple download using reqwest blocking
    match reqwest::blocking::get(url) {
        Ok(mut resp) => {
            if resp.status().is_success() {
                let mut out = std::fs::File::create(&path)?;
                std::io::copy(&mut resp, &mut out)?;
                Ok(HttpResponse::Ok().json(json!({"code":200, "message":"File downloaded"})))
            } else {
                Ok(HttpResponse::InternalServerError().json(json!({"code":500, "message":"An issue has occurred"})))
            }
        }
        Err(e) => {
            error!("download error: {}", e);
            Ok(HttpResponse::InternalServerError()
                .json(serde_json::json!({"code":500, "message":"An issue has occurred"})))
        }
    }
}

#[delete("/images/{image:.*}")]
async fn delete_image(
    data: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    if !check_auth(&req, &data.config) {
        return Ok(HttpResponse::Unauthorized()
            .json(serde_json::json!({"code":401, "message":"Unauthorized"})));
    }
    let image_str = path.into_inner();
    let image = Path::new(&image_str);
    if image == Path::new("") || !allowed_extension(image) {
        return Ok(HttpResponse::BadRequest()
            .json(serde_json::json!({"code":400, "message":"Invalid or missing argument"})));
    }
    let fullpath = Path::new(&data.config.location).join(image);
    match std::fs::remove_file(fullpath) {
        Ok(_) => Ok(HttpResponse::Ok().json(json!({"code":200, "message":"File deleted"}))),
        Err(e) => {
            error!("delete error: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({"code":500, "message":"An issue has occurred"})))
        }
    }
}

#[get("/test")]
async fn get_test() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({"code":200})))
}

#[post("/test")]
async fn post_test(body: web::Json<serde_json::Value>) -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({"code":200, "data": *body})))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init();

    let settings = config::Config::builder()
        .add_source(config::File::with_name("config/settings").required(false))
        .add_source(config::Environment::with_prefix("MONIKA").separator("__"))
        .build()
        .expect("failed to load configuration");
    let config: Settings = settings
        .try_deserialize()
        .expect("failed to load configuration");

    let state = web::Data::new(AppState {
        config: Arc::new(config),
    });
    let listen_addr = format!("0.0.0.0:{}", state.config.cdn_port);
    log::info!("starting cdn on {}", listen_addr);
    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(state.clone())
            .service(serve_image)
            .service(download_image)
            .service(delete_image)
            .service(get_test)
            .service(post_test)
    })
    .bind(listen_addr)?
    .run()
    .await
}
