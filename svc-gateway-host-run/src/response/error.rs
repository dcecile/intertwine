use crate::header as svc_header;
use crate::response::simple as svc_response_simple;
use bytes::Bytes;
use http;
use http::StatusCode;
use thiserror;

#[derive(thiserror::Error, Debug)]
#[error("response error {status:?} ({message:?})")]
pub struct Error {
  pub status: StatusCode,
  pub message: Bytes,
}

impl Error {
  pub fn new<T>(status: StatusCode, message: T) -> Self
  where
    Bytes: From<T>,
  {
    Self {
      status,
      message: message.into(),
    }
  }

  pub fn into_simple_response(
    self,
  ) -> svc_response_simple::SimpleResponse {
    svc_response_simple::SimpleResponse {
      status: self.status,
      sandbox: false,
      cache_control: None,
      content_type: svc_header::ContentType(&mime::TEXT_PLAIN),
      e_tag: None,
      service_worker_allowed: None,
      body: self.message,
    }
  }
}
