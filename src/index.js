import { Observable } from 'rx'
import Cycle from '@cycle/core'
import { p, div, label, input, h1, makeDOMDriver } from '@cycle/dom'
import { makeHTTPDriver } from '@cycle/http'
import { filter, propSatisfies, compose, test, map, F, T } from 'ramda'
import { h } from './isolated-dom'

const targetValue = (e) => e.target.value
const contains = (q) => test(new RegExp(q))

const User = ({ DOM, props }) => {
  const [ name, nameDom ] = h('div', DOM)
  const [ email, emailDom ] = h('div', DOM)

  const nameClick$ = nameDom
    .events('click')

  const showEmail$ = nameClick$
    .startWith(false)
    .scan((acc) => {
      return !acc
    })

  const sinks = {
    DOM: showEmail$.map(
      showEmail =>
        div([
          name(props.user.name),
          email(
            { style: { display: showEmail ? 'block' : 'none' } },
            props.user.email
          ),
        ])
      ),
  }

  return sinks
}

function main({ DOM, HTTP }) {
  const [ searchField, searchFieldDOM ] = h('input', DOM)
  const searchFieldValue$ = searchFieldDOM
    .events('input')
    .map(targetValue)
    .startWith('')

  const userSearch$ = searchFieldValue$
    .filter(val => val.length > 0)

  const userSearchDebounced$ = userSearch$
    .debounce(250)
    .distinctUntilChanged()

  const userSearchResult$ = HTTP
    .switch()
    .map(response => response.body)
    .startWith([])

  const userVtrees$ = userSearchResult$
    .map(users => users.map(user => {
      const props = { user }
      const userSinks = User({ props, DOM })
      return userSinks.DOM
    }))

  const usersVtree$ = Observable
    .combineLatest(userVtrees$)
    .map(userVtrees =>
      div(userVtrees)
    )

  const userSearchLoading$ = Observable
    .merge(userSearchResult$.map(F), userSearch$.map(T))
    .startWith(false)

  const sinks = {
    DOM: Observable.combineLatest(
      [userSearchLoading$, searchFieldValue$, usersVtree$],
      (userSearchLoading, searchFieldValue, usersVtree) =>
        div([
          div(userSearchLoading ? 'Loading...' : ''),
          searchField({
            attributes: {
              type: 'text',
              placeholder: 'Ervin Howell',
            }
          }),
          usersVtree,
        ])
      ),
    HTTP: userSearchDebounced$
      .map(val => {
        return { url: 'http://jsonplaceholder.typicode.com/users' }
      }),
    Log: usersVtree$,
  }
  return sinks
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver(),
  Log: (log$) => log$.subscribe((log) => console.log(log)),
})
