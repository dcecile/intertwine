use crate::nix_child::NixChild as _;
use anyhow::anyhow;
use anyhow::Result;
use clap;
use clap::Parser as _;
use nix::sys::signal::Signal;
use std::path::Path;
use std::process::ExitCode;
use std::process::ExitStatus;
use std::sync::Arc;
use tokio::fs;
use tokio::process::Child;
use tokio::process::Command;
use tokio::select;
use tokio::sync::Semaphore;
use tokio::sync::TryAcquireError;
use tokio::task::JoinSet;
use watchman_client::expr::Expr;
use watchman_client::expr::NameTerm;
use watchman_client::fields::NameOnly;
use watchman_client::pdu::FileType;
use watchman_client::pdu::SubscribeRequest;
use watchman_client::CanonicalPath;
use watchman_client::Connector;
use watchman_client::SubscriptionData;

#[derive(Clone, Debug, clap::Parser)]
#[command(version)]
struct Cli {
  #[arg(short, long)]
  mode: Mode,

  #[arg(short, long)]
  restart: bool,

  #[arg(required = true, last = true)]
  command: Vec<String>,
}

impl Cli {
  fn program(&self) -> Result<&String> {
    self.command.first().ok_or(anyhow!("empty command"))
  }

  fn args(&self) -> &[String] {
    self.command.get(1 ..).unwrap_or_default()
  }
}

#[derive(
  Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, clap::ValueEnum,
)]
enum Mode {
  Executable,
  Haskell,
  Rust,
  TypeScript,
}

#[allow(clippy::print_stderr)]
#[tokio::main]
pub async fn main() -> Result<ExitCode> {
  match Cli::try_parse() {
    Ok(cli) => {
      let files_changed = Arc::new(Semaphore::new(0));
      let mut join_set = JoinSet::new();
      join_set.spawn(watch_files(cli.clone(), files_changed.clone()));
      join_set.spawn(run_command(cli.clone(), files_changed.clone()));
      let err = join_set
        .join_next()
        .await
        .ok_or(anyhow!("empty join set"))?
        .map_err(anyhow::Error::from)
        .and_then(|inner_result| inner_result)
        .expect_err("join error");
      eprintln!("[watch] {err:?}");
      join_set.shutdown().await;
    }
    Err(err) => {
      err.print()?;
    }
  }
  Ok(ExitCode::from(1))
}

#[allow(clippy::print_stdout)]
async fn watch_files(
  cli: Cli,
  files_changed: Arc<Semaphore>,
) -> Result<!> {
  let client = Connector::new()
    .unix_domain_socket("build/watchman-unix-listener")
    .connect()
    .await?;
  println!("[watch] Connected to Watchman server");
  let root_path = if cli.mode == Mode::Executable {
    let program_path = Path::new(cli.program()?);
    let program_dir = program_path
      .parent()
      .ok_or(anyhow!("missing program parent"))?;
    write_executable_config(program_dir).await?;
    program_dir
  } else {
    Path::new(".")
  };
  let root = client
    .resolve_root(CanonicalPath::canonicalize(root_path)?)
    .await?;
  println!(
    "[watch] Resolved root: {:?} ({})",
    root.project_root(),
    root.watcher()
  );
  let (mut subscription, _) = client
    .subscribe::<NameOnly>(
      &root,
      SubscribeRequest {
        since: None,
        relative_root: Some(".".into()),
        expression: Some(build_expr(&cli)?),
        fields: vec!["name", "type"],
        empty_on_fresh_instance: false,
        case_sensitive: true,
        defer_vcs: true,
        defer: Vec::default(),
        drop: Vec::default(),
      },
    )
    .await?;
  println!("[watch] Subscription ready");
  loop {
    match subscription.next().await? {
      SubscriptionData::Canceled => {
        return Err(anyhow!("watch cancelled"));
      }
      SubscriptionData::FilesChanged(query_result) => {
        if matches!(
          files_changed.try_acquire(),
          Err(TryAcquireError::Closed)
        ) {
          return Err(anyhow!("semaphore closed"));
        }
        files_changed.add_permits(1);
        println!(
          "[watch] Files changed: {}",
          query_result.files.unwrap_or_default().len()
        );
      }
      _ => {}
    }
  }
}

async fn write_executable_config(program_dir: &Path) -> Result<()> {
  fs::write(program_dir.join(".watchmanconfig.json"), "{}").await?;
  Ok(())
}

fn build_expr(cli: &Cli) -> Result<Expr> {
  let file_expr = match cli.mode {
    Mode::Executable => {
      vec![Expr::Name(NameTerm {
        paths: vec![
          Path::new(cli.program()?)
            .file_name()
            .ok_or(anyhow!("empty program"))?
            .into(),
        ],
        wholename: true,
      })]
    }
    Mode::Haskell => vec![
      Expr::Suffix(vec!["hs".into(), "cabal".into()]),
      Expr::Name(NameTerm {
        paths: vec![
          "package.yaml".into(),
          "stack.yaml".into(),
          "stack.yaml.lock".into(),
        ],
        wholename: false,
      }),
      Expr::Name(NameTerm {
        paths: vec!["dev-task/stack.yml".into()],
        wholename: true,
      }),
    ],
    Mode::Rust => vec![
      Expr::Suffix(vec!["rs".into(), "sql".into()]),
      Expr::Name(NameTerm {
        paths: vec!["Cargo.lock".into(), "Cargo.toml".into()],
        wholename: false,
      }),
      Expr::Name(NameTerm {
        paths: vec!["dev-task/cargo.yml".into()],
        wholename: true,
      }),
    ],
    Mode::TypeScript => vec![
      Expr::Suffix(vec![
        "ts".into(),
        "js".into(),
        "cjs".into(),
        "sql".into(),
      ]),
      Expr::Name(NameTerm {
        paths: vec![
          ".eslintrc.json".into(),
          "package.json".into(),
          "pnpm-lock.yaml".into(),
          "pnpm-workspace.yaml".into(),
          "tsconfig.json".into(),
        ],
        wholename: false,
      }),
      Expr::Name(NameTerm {
        paths: vec![
          "dev-eslint/index.json".into(),
          "dev-task/pnpm.yml".into(),
        ],
        wholename: true,
      }),
    ],
  };
  Ok(Expr::All(vec![
    Expr::FileType(FileType::Regular),
    Expr::Any(file_expr),
  ]))
}

async fn run_command(
  cli: Cli,
  files_changed: Arc<Semaphore>,
) -> Result<!> {
  let mut child: Option<Child> = None;
  let mut restart_pending = false;
  loop {
    select! {
      permit = files_changed.acquire(),
      if (cli.restart && !restart_pending) || child.is_none() => {
        permit?.forget();
        handle_files_changed(&cli, &mut child, &mut restart_pending)?;
      }
      status = async {
        child.as_mut().map(Child::wait).expect("some child").await
      }, if child.is_some() => {
        handle_child_done(
          &cli, status?, &mut child, &mut restart_pending
        )?;
      }
    }
  }
}

fn handle_files_changed(
  cli: &Cli,
  child: &mut Option<Child>,
  restart_pending: &mut bool,
) -> Result<()> {
  match &child {
    Some(child) => {
      restart_child(child, restart_pending)?;
    }
    None => {
      start_child(cli, child)?;
    }
  }
  Ok(())
}

#[allow(clippy::print_stdout)]
fn handle_child_done(
  cli: &Cli,
  status: ExitStatus,
  child: &mut Option<Child>,
  restart_pending: &mut bool,
) -> Result<()> {
  if let Some(code) = status.code() {
    println!("[watch] Exit code {code}");
  } else {
    println!("[watch] Unknown exit code");
  }
  *child = None;
  if *restart_pending {
    start_child(cli, child)?;
    *restart_pending = false;
  }
  Ok(())
}

#[allow(clippy::print_stdout)]
fn start_child(cli: &Cli, child: &mut Option<Child>) -> Result<()> {
  let program = cli.program()?;
  let args = cli.args();
  *child = Some(Command::new(program).args(args).spawn()?);
  println!("[watch] Started {program}");
  Ok(())
}

#[allow(clippy::print_stdout)]
fn restart_child(child: &Child, restart_pending: &mut bool) -> Result<()> {
  child.signal_kill(Signal::SIGTERM)?;
  *restart_pending = true;
  println!("[watch] Restarting");
  Ok(())
}