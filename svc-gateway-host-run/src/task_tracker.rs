use crate::context as svc_context;
use crate::state::Context as _;
use crate::state::StateExt;
use hyper::rt::Executor as HyperExecutor;
use std::future::Future;
use std::sync::Arc;
use std::thread;
use std::thread::JoinHandle as StdJoinHandle;
use tokio_util::task::TaskTracker;

pub trait TaskTrackerExt {
  fn spawn_thread<F, T>(&self, func: F) -> StdJoinHandle<T>
  where
    F: FnOnce() -> T,
    F: Send + 'static,
    T: Send + 'static;
}

impl TaskTrackerExt for TaskTracker {
  fn spawn_thread<F, T>(&self, func: F) -> StdJoinHandle<T>
  where
    F: FnOnce() -> T,
    F: Send + 'static,
    T: Send + 'static,
  {
    let token = self.token();
    thread::spawn(move || {
      let result = func();
      drop(token);
      result
    })
  }
}

#[derive(Clone)]
pub struct TaskTrackerExecutor {
  pub ctx: Arc<svc_context::ContextImpl>,
  pub task_tracker: TaskTracker,
}

impl TaskTrackerExecutor {
  pub fn new(
    ctx: Arc<svc_context::ContextImpl>,
    task_tracker: &TaskTracker,
  ) -> Self {
    TaskTrackerExecutor {
      ctx,
      task_tracker: task_tracker.clone(),
    }
  }
}

impl<F> HyperExecutor<F> for TaskTrackerExecutor
where
  F: Future + Send + 'static,
  F::Output: Send + 'static,
{
  fn execute(&self, future: F) {
    let ctx = self.ctx.clone();
    self.task_tracker.spawn(async move {
      ctx.state().scope_response_stream(future).await;
    });
  }
}
