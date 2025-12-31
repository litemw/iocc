import {expect, test, mock, describe} from 'bun:test';
import {createComponent, defineComponent, defineInterface, inject, provide} from "../lib";

describe('sample', () => {
  test("basic", () => {

    const Config = defineInterface<
      {
        str: string
      }
    >()

    const configComponent = defineComponent(() => {
      return {str: 'some-str'}
    })

    type t = typeof Config

    const userComponent = defineComponent(() => {
      const cf = inject(Config)
      return {
        f(){
          console.log(cf.str)
        }
      }
    })

    const appComponent = defineComponent(() => {
      provide(configComponent, Config)
      const us = provide(userComponent)
      return {
        us
      }
    })


    const app = createComponent(appComponent)
    app.us.f()
  })
})