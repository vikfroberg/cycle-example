import { h as createElement } from '@cycle/dom'

var i = 0

export const h = (tag, DOM) => {
  const address = 'isolated-dom-' + i++
  const { isolateSink, isolateSource } = DOM
  const createTag = (...rest) => {
    const vtree = createElement(tag, ...rest)
    const isolatedVtree = isolateSink([vtree], address)
    return isolatedVtree[0]
  }
  return [createTag, isolateSource(DOM, address), address]
}
