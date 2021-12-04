use crate::core::document::Document;
use crate::core::hex::from_hex;
use std::collections::HashMap;
use std::env;
use std::error::Error as StdError;
use time::OffsetDateTime;
use tokio::spawn;

pub struct Context {
  pub client: tokio_postgres::Client,
}

pub struct Handle {
  pub connection_handle: tokio::task::JoinHandle<()>,
}

pub async fn load() -> Result<
  (Context, Handle),
  Box<dyn StdError + Send + Sync>,
> {
  let (url, params) = get_url()?;
  let tls = get_tls(&params)?;
  let config = get_config(&url, &params)?;
  let (client, connection) = config.connect(tls).await?;
  let connection_handle = spawn(run_connection(connection));
  Ok((Context { client }, Handle { connection_handle }))
}

async fn run_connection(
  connection: tokio_postgres::Connection<
    tokio_postgres::Socket,
    postgres_openssl::TlsStream<tokio_postgres::Socket>,
  >,
) {
  connection.await.expect("DB connection error");
}

fn get_url() -> Result<
  (url::Url, HashMap<String, String>),
  Box<dyn StdError + Send + Sync>,
> {
  let url: url::Url =
    env::var("DATABASE_URL_API_READ")?.parse()?;
  let params = url
    .query_pairs()
    .into_owned()
    .collect::<HashMap<String, String>>();
  Ok((url, params))
}

fn get_tls(
  params: &HashMap<String, String>,
) -> Result<
  postgres_openssl::MakeTlsConnector,
  Box<dyn StdError + Send + Sync>,
> {
  let mut tls_builder =
    openssl::ssl::SslConnector::builder(
      openssl::ssl::SslMethod::tls(),
    )?;
  if let Some(cert) = params.get("sslcert") {
    tls_builder.set_certificate_chain_file(cert)?;
  }
  if let Some(key) = params.get("sslkey") {
    tls_builder.set_private_key_file(
      key,
      openssl::ssl::SslFiletype::PEM,
    )?;
  }
  if let Some(root_cert) = params.get("sslrootcert") {
    tls_builder.set_ca_file(root_cert)?;
  }
  if params.get("sslmode")
    == Some(&"verify-full".to_string())
  {
    tls_builder
      .set_verify(openssl::ssl::SslVerifyMode::PEER);
  }
  Ok(postgres_openssl::MakeTlsConnector::new(
    tls_builder.build(),
  ))
}

fn get_config(
  url: &url::Url,
  params: &HashMap<String, String>,
) -> Result<
  tokio_postgres::config::Config,
  Box<dyn StdError + Send + Sync>,
> {
  let mut config = tokio_postgres::config::Config::new();
  if url.username() != "" {
    config.user(url.username());
  }
  if let Some(password) = url.password() {
    let decoded_passowrd: &str =
      &percent_encoding::percent_decode_str(password)
        .decode_utf8()?;
    config.password(decoded_passowrd);
  }
  if let Some(host) = url.host_str() {
    config.host(host);
  }
  if let Some(port) = url.port() {
    config.port(port);
  }
  if let Some(mut path_segments) = url.path_segments() {
    if let Some(db_name) = path_segments.next() {
      config.dbname(db_name);
    }
  }
  if let Some(options) = params.get("options") {
    config.options(options);
  }
  Ok(config)
}

pub async fn find_recent_updates(
  db_context: &Context,
) -> Result<Vec<Document>, Box<dyn StdError + Send + Sync>>
{
  const QUERY_TEXT: &str = include_str!(
    "../../../db/src/query/recent_updates_find.sql"
  );
  const QUERY_LIMIT: i64 = 256;
  let mut done = false;
  let mut updated_at: Option<OffsetDateTime> = None;
  let mut type_: Option<String> = None;
  let mut id: Option<Vec<u8>> = None;
  let mut results = Vec::<Document>::new();
  while !done {
    let rows = &db_context
      .client
      .query(
        QUERY_TEXT,
        &[&QUERY_LIMIT, &updated_at, &type_, &id],
      )
      .await?;
    results.append(
      &mut rows
        .iter()
        .map(create_document_from_row)
        .collect::<Result<
        Vec<Document>,
        Box<dyn StdError + Send + Sync>,
      >>()?,
    );
    if rows.len() == QUERY_LIMIT as usize {
      let last = results.last().ok_or("no last")?;
      updated_at = Some(last.updated_at);
      type_ = Some(last.type_.clone());
      id = Some(last.id.clone());
    } else {
      done = true;
    }
  }
  Ok(results)
}

fn create_document_from_row(
  row: &tokio_postgres::Row,
) -> Result<Document, Box<dyn StdError + Send + Sync>> {
  Ok(Document {
    type_: row.try_get("type")?,
    id: row.try_get("id")?,
    created_at: row.try_get("created_at")?,
    created_by: row.try_get("created_by")?,
    updated_at: row.try_get("updated_at")?,
    deleted: row.try_get("deleted")?,
    language: row.try_get("language")?,
    subforum_id: row.try_get("subforum_id")?,
    topic_id: row.try_get("topic_id")?,
    taxon_rank: row.try_get("taxon_rank")?,
    title: row.try_get("title")?,
    names: create_document_names(row.try_get("names")?)?,
    tags: create_document_tags(row.try_get("tags")?)?,
    content: row.try_get("content")?,
  })
}

fn create_document_names(
  value: Option<serde_json::value::Value>,
) -> Result<
  Option<Vec<String>>,
  Box<dyn StdError + Send + Sync>,
> {
  if let Some(value) = value {
    Ok(Some(
      value
        .as_array()
        .ok_or("names is not an array")?
        .iter()
        .map(|item| {
          Ok(
            item
              .as_str()
              .ok_or("name is not str")?
              .to_owned(),
          )
        })
        .collect::<Result<
          Vec<String>,
          Box<dyn StdError + Send + Sync>,
        >>()?,
    ))
  } else {
    Ok(None)
  }
}

fn create_document_tags(
  value: Option<serde_json::value::Value>,
) -> Result<
  Option<Vec<Vec<u8>>>,
  Box<dyn StdError + Send + Sync>,
> {
  if let Some(value) = value {
    Ok(Some(
      value
        .as_array()
        .ok_or("tags is not an array")?
        .iter()
        .map(|item| {
          from_hex(item.as_str().ok_or("tag is not str")?)
        })
        .collect::<Result<
          Vec<Vec<u8>>,
          Box<dyn StdError + Send + Sync>,
        >>()?,
    ))
  } else {
    Ok(None)
  }
}
