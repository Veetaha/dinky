const {URLSearchParams, parse, format} = require("url")

const test = require("ava")
const pq = require("proxyquire")
const fm = require("fetch-mock")

const {Response} = require("node-fetch")

const Query = require("../../../lib/Query")

const pattern = /^https:\/\/(derpibooru|trixiebooru).org/

test("Creates fetcher with default url", async t => {
  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink()

  await link(["images"], new Query())

  t.true(fetch.called())

  const {hostname, protocol} = parse(fetch.lastUrl())

  t.is(format({hostname, protocol}), "https://derpibooru.org")
})

test("Creates fetcher with reserve url", async t => {
  const expected = "https://trixiebooru.org"

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink({url: expected})

  await link(["images"], new Query())

  t.true(fetch.called())

  const {hostname, protocol} = parse(fetch.lastUrl())

  t.is(format({hostname, protocol}), expected)
})

test("Creates a correct request address from given path and query", async t => {
  const fetch = fm.sandbox().mock(pattern, {})

  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink()
  const query = new Query()

  query.set("q", "princess luna")

  await link(["search"], query)

  t.true(fetch.called())

  const actual = parse(fetch.lastUrl())

  t.is(actual.pathname, "/search.json")
  t.is(actual.query, "q=princess+luna")
})

test("Appends given key to query params", async t => {
  const expected = "secret"

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink({key: expected})
  const query = new Query()

  await link(["search"], query)

  t.true(fetch.called())

  const url = parse(fetch.lastUrl())
  const actual = new URLSearchParams(url.query)

  t.is(actual.get("key"), expected)
})

test("Appends given filter_id to query params", async t => {
  const expected = 419

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink({filter: expected})
  const query = new Query()

  await link(["search"], query)

  t.true(fetch.called())

  const url = parse(fetch.lastUrl())
  const actual = new URLSearchParams(url.query)

  t.is(actual.get("filter_id"), String(expected))
})

test("Allows to set per-request key in the third argument", async t => {
  const expected = "secret"

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink()

  await link(["search"], new Query(), {key: expected})

  const url = parse(fetch.lastUrl())
  const actual = new URLSearchParams(url.query)

  t.is(actual.get("key"), expected)
})

test("Per-request key have priority over the default one", async t => {
  const expected = "another-key"

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink({key: "secret"})

  await link(["search"], new Query(), {key: expected})

  const url = parse(fetch.lastUrl())
  const actual = new URLSearchParams(url.query)

  t.is(actual.get("key"), expected)
})

test("Allows to set per-request filter in the third argument", async t => {
  const expected = 419

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink()

  await link(["search"], new Query(), {filter: expected})

  const url = parse(fetch.lastUrl())
  const actual = new URLSearchParams(url.query)

  t.is(actual.get("filter_id"), String(expected))
})

test("Per-request filter have priority over the default one", async t => {
  const expected = 451

  const fetch = fm.sandbox().mock(pattern, {})
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink({filter: 419})

  await link(["search"], new Query(), {filter: expected})

  const url = parse(fetch.lastUrl())
  const actual = new URLSearchParams(url.query)

  t.is(actual.get("filter_id"), String(expected))
})

test("Throws an error for non 2xx response", async t => {
  const fetch = fm.sandbox().mock(pattern, 404)
  const createLink = pq("../../../lib/util/link", {"node-fetch": fetch})

  const link = createLink()

  const err = await t.throwsAsync(link(["search"], new Query()))

  t.true(err instanceof Error)
  t.is(err.message, "Network error: 404")

  t.true(err.response instanceof Response)
  t.is(err.response.status, 404)
})

test("Throws an error when unknown url was set", async t => {
  const link = pq("../../../lib/util/link", {"node-fetch": () => { }})({
    url: "https://unknownhost.org"
  })

  const err = await t.throwsAsync(link([], new Query()))

  t.is(
    err.message,
    "Dinky can send requests only to these hosts: " +
    "trixiebooru.org, derpibooru.org"
  )
})
