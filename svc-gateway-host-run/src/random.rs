use anyhow::anyhow;
use anyhow::Error;
#[cfg(test)]
use mockall::automock;
#[cfg(test)]
use mockall::mock;
use ring::rand;

pub trait Context
where
  Self::Impl: Random,
{
  type Impl;

  fn random(&self) -> &Self::Impl;
}

#[cfg(test)]
mock! {
  pub Context {}
  impl Context for Context {
      type Impl = MockRandom;
      fn random(&self) -> &<Self as Context>::Impl;
  }
}

#[cfg_attr(test, automock)]
pub trait Random {
  fn rng(&self) -> &dyn rand::SecureRandom;
}

pub struct RandomImpl {
  system_random: rand::SystemRandom,
}

impl RandomImpl {
  pub fn init() -> Self {
    RandomImpl {
      system_random: rand::SystemRandom::new(),
    }
  }
}

impl Random for RandomImpl {
  fn rng(&self) -> &dyn rand::SecureRandom {
    &self.system_random
  }
}

pub trait RandomExt {
  fn generate<T>(&self) -> Result<rand::Random<T>, Error>
  where
    T: rand::RandomlyConstructable;

  fn response_stream_id(&self) -> Result<rand::Random<[u8; 256]>, Error>;
}

impl<R> RandomExt for R
where
  R: Random,
{
  fn generate<T>(&self) -> Result<rand::Random<T>, Error>
  where
    T: rand::RandomlyConstructable,
  {
    rand::generate(self.rng()).map_err(|_| anyhow!("rng error"))
  }

  fn response_stream_id(&self) -> Result<rand::Random<[u8; 256]>, Error> {
    self.generate()
  }
}