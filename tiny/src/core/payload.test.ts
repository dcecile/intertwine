import * as payload from '@tiny/core/payload.ts'
import * as test from '@tiny/test/index.ts'

export const url = import.meta.url

export const tests = {
  ['null, ok']: (): void => {
    const validator = payload.object({
      x: payload.nullOr(payload.object({})),
      y: payload.nullOr(payload.object({})),
    })
    const input = { x: null, y: {} }
    test.assertDeepEquals(validator.check(input), input)
  },
  ['object, ok']: (): void => {
    const validator = payload.object({
      x: payload.object({}),
    })
    const input = { x: {} }
    test.assertDeepEquals(validator.check(input), input)
  },
  ['object, wrong type']: (): void => {
    const validator = payload.object({})
    const error = test.assertThrows(() =>
      validator.check(null)
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid object (wrong type null) at (root)'
    )
  },
  ['object, extra key ok']: (): void => {
    const validator = payload.object({})
    const input = { x: {} }
    test.assertDeepEquals(validator.check(input), {})
  },
  ['object, missing key']: (): void => {
    const validator = payload.object({
      x: payload.object({}),
    })
    const error = test.assertThrows(() =>
      validator.check({})
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid object (missing key "x") at (root)'
    )
  },
  ['object, nested missing key']: (): void => {
    const validator = payload.object({
      x: payload.object({
        ['space y']: payload.object({
          z: payload.object({}),
        }),
      }),
    })
    const error = test.assertThrows(() =>
      validator.check({ x: { ['space y']: {} } })
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid object (missing key "z") at (root).x["space y"]'
    )
  },
  ['array, ok']: (): void => {
    const validator = payload.array(payload.object({}))
    const input = [{}]
    test.assertDeepEquals(validator.check(input), input)
  },
  ['array, wrong type']: (): void => {
    const validator = payload.array(payload.object({}))
    const error = test.assertThrows(() =>
      validator.check(null)
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid array (wrong type null) at (root)'
    )
  },
  ['array, nested missing key']: (): void => {
    const validator = payload.array(
      payload.object({
        ['space y']: payload.object({
          z: payload.object({}),
        }),
      })
    )
    const error = test.assertThrows(() =>
      validator.check([{ ['space y']: {} }])
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid object (missing key "z") at (root)[0]["space y"]'
    )
  },
  ['string, ok']: (): void => {
    const validator = payload.string({
      min: 2,
      max: 5,
    })
    const input = 'abcde'
    test.assertDeepEquals(validator.check(input), input)
  },
  ['string, wrong type']: (): void => {
    const validator = payload.string({
      min: 2,
      max: 5,
    })
    const error = test.assertThrows(() =>
      validator.check([])
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid string (wrong type array) at (root)'
    )
  },
  ['string, too short']: (): void => {
    const validator = payload.string({
      min: 2,
      max: 5,
    })
    const error = test.assertThrows(() =>
      validator.check('a')
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid string (too short, min 2) at (root)'
    )
  },
  ['string, too long']: (): void => {
    const validator = payload.string({
      min: 2,
      max: 5,
    })
    const error = test.assertThrows(() =>
      validator.check('abcdef')
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid string (too long, max 5) at (root)'
    )
  },
  ['stringOptions, ok']: (): void => {
    const validator = payload.stringOption('abc', 'xyz')
    const input = 'abc'
    test.assertDeepEquals(validator.check(input), input)
  },
  ['stringOptions, wrong type']: (): void => {
    const validator = payload.stringOption('abc', 'xyz')
    const error = test.assertThrows(() =>
      validator.check(2)
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid string option (wrong type number) at (root)'
    )
  },
  ['stringOptions, wrong option']: (): void => {
    const validator = payload.stringOption('abc', 'xyz')
    const error = test.assertThrows(() =>
      validator.check('a')
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid string option (not "abc" | "xyz") at (root)'
    )
  },
  ['stringEnum, ok']: (): void => {
    enum Test {
      x = 'x',
      y = 'y2',
    }
    const validator = payload.stringEnum(Test)
    const input = 'y2'
    test.assertDeepEquals(validator.check(input), Test.y)
  },
  ['stringEnum, wrong enum']: (): void => {
    enum Test {
      x = 'x',
      y = 'y2',
    }
    const validator = payload.stringEnum(Test)
    const error = test.assertThrows(() =>
      validator.check('y')
    )
    test.assertInstanceOf(error, payload.PayloadError)
    test.assertEquals(
      error.message,
      'Invalid enum (not "x" | "y2") at (root)'
    )
  },
  ['conflictResponse, ok']: (): void => {
    const validator = payload.conflict('abc', 'xyz')
    const input = { conflict: 'abc' }
    test.assertDeepEquals(validator.check(input), input)
  },
  ['getTypeName, wrong option']: (): void => {
    test.assertEquals(payload.getTypeName(null), 'null')
    test.assertEquals(payload.getTypeName('a'), 'string')
    test.assertEquals(payload.getTypeName(1), 'number')
    test.assertEquals(payload.getTypeName([]), 'array')
    test.assertEquals(payload.getTypeName({}), 'object')
    test.assertEquals(payload.getTypeName(true), 'boolean')
  },
}
