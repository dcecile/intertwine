declare module '*.sql' {
  const text: string
  // eslint-disable-next-line import/no-default-export -- most convenient way to consume
  export default text
}
