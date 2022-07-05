import { resolveFetch } from './helper'
import { Fetch, FunctionInvokeOptions } from './types'

/**
 * Response format
 *
 */
 interface FunctionsResponseBase {
  status?: number
  statusText?: string
}
interface FunctionsResponseSuccess<T> extends FunctionsResponseBase {
  status: number
  statusText: string
  error: null
  data: T
}
interface FunctionsResponseFailure extends FunctionsResponseBase {
  error: any
  data: null
}
export type FunctionsResponse<T> = FunctionsResponseSuccess<T> | FunctionsResponseFailure

export class FunctionsError extends Error {
  data: any
  constructor(data: any) {
    super('Invoke call returned non-2xx status')
    this.data = data
  }
}

export class FunctionsClient {
  protected url: string
  protected headers: Record<string, string>
  protected fetch: Fetch
  protected shouldThrowOnError: boolean

  constructor(
    url: string,
    {
      headers = {},
      customFetch,
      shouldThrowOnError = false,
    }: {
      headers?: Record<string, string>
      customFetch?: Fetch
      shouldThrowOnError?: boolean
    } = {}
  ) {
    this.url = url
    this.headers = headers
    this.fetch = resolveFetch(customFetch)
    this.shouldThrowOnError = shouldThrowOnError
  }

  /**
   * Updates the authorization header
   * @params token - the new jwt token sent in the authorisation header
   */
  setAuth(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  /**
   * Invokes a function
   * @param functionName - the name of the function to invoke
   * @param invokeOptions - object with the following properties
   * `headers`: object representing the headers to send with the request
   * `body`: the body of the request
   * `responseType`: how the response should be parsed. The default is `json`
   */
  async invoke<T = any>(
    functionName: string,
    invokeOptions?: FunctionInvokeOptions
  ): Promise<FunctionsResponse<T>> {

    let status: number | undefined
    let statusText: string | undefined
    
    try {
      const { headers, body } = invokeOptions ?? {}
      const response = await this.fetch(`${this.url}/${functionName}`, {
        method: 'POST',
        headers: Object.assign({}, this.headers, headers),
        body,
      })

      status = response.status
      statusText = response.statusText

      const isRelayError = response.headers.get('x-relay-error')
      if (isRelayError && isRelayError === 'true') {
        throw new Error(await response.text())
      }

      let data
      const { responseType } = invokeOptions ?? {}
      if (!responseType || responseType === 'json') {
        data = await response.json()
      } else if (responseType === 'arrayBuffer') {
        data = await response.arrayBuffer()
      } else if (responseType === 'blob') {
        data = await response.blob()
      } else {
        data = await response.text()
      }

      // Detect HTTP status codes other than 2xx and reject as error
      if (!response.ok) {
        throw new FunctionsError(data)
      }

      const success: FunctionsResponseSuccess<T> = { data, error: null, status, statusText }
      return success
    } catch (error: any) {
      if (this.shouldThrowOnError) {
        throw error
      }

      const failure: FunctionsResponseFailure = { data: null, error }
      if (status) (
        failure.status = status
      )
      if (statusText) {
        failure.statusText = statusText
      }
      return failure
    }
  }
}
