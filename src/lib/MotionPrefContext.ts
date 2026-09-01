import { createContext, useContext } from 'react'

/** Whether the whole board should pare its animation back (see
 * `useReducedMotion` — the OS "reduce motion" setting, or an explicit
 * override). Provided once by `Board` so the ~52 cards don't each spin up
 * their own media-query listener. */
export const ReducedMotionContext = createContext(false)

export const useReducedMotionValue = () => useContext(ReducedMotionContext)
