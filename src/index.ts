import { resolveFetch } from './helper'
import { Fetch, FunctionsResponse, FunctionInvokeOptions } from './types'


class FunctionsError extends Error {
  context: any
  constructor(message: string, name: string = 'FunctionsError', context?: any) {
    super('FunctionsError: ' + message)
    super.name = name
    this.context = context
  }
}

export class SerializationError extends FunctionsError {
  constructor(context: any) {
    super('Failed to serialize input data into a proper Request object', 'SerializationError', context)
  }
}

export class DeserializationError extends FunctionsError {
  constructor(context: any) {
    super('Failed to deserialize the Response object into output data', 'DeserializationError', context)
  }
}

export class FetchError extends FunctionsError {
  constructor(context: any) {
    super('Failed to fetch data from edge server', 'FetchError', context)
  }
}

export class RelayError extends FunctionsError {
  constructor(context: any) {
    super('Relay error communicating with deno backend', 'RelayError', context)
  }
}

export class HttpError extends FunctionsError {
  status: number
  statusText: string
  constructor(status: number, statusText: string, context: any) {
    super('Edge server returned a non-2xx status code', context)
    this.status = status
    this.statusText = statusText
  }
}

export class FunctionsClient {
  protected url: URL
  protected headers: Headers
  protected fetch: Fetch
  protected shouldThrowOnError: boolean

  constructor(
    url: string,
    {
      headers,
      customFetch,
      shouldThrowOnError = false,
    }: {
      headers?: RequestInit["headers"]
      customFetch?: Fetch
      shouldThrowOnError?: boolean
    } = {}
  ) {
    this.url = new URL(url)
    this.headers = new Headers(headers)
    this.fetch = resolveFetch(customFetch)
    this.shouldThrowOnError = shouldThrowOnError
  }

  /**
   * Updates the authorization header
   * @params token - the new jwt token sent in the authorisation header
   */
  setAuth(token: string) {
    this.headers.set('Authorization', `Bearer ${token}`)
  }

  /**
   * Invokes a function
   * @param functionName - the name of the function to invoke
   * @param input - the input data: can be File, Blob, FormData or JSON object
   * @param invokeOptions - object with the following properties
   * `requestTransform`: a serialization callback returning RequestInit parameters from the input data parameter
   * `responseTransform`: a de-serialization callback returning data from a Response object
   */
  async invoke(
    functionName: string,
    input: any,
    invokeOptions?: FunctionInvokeOptions
  ): Promise<FunctionsResponse> {

    try {
      // Serialize the input data
      const requestTransform = invokeOptions?.requestTransform || defaultRequestTransform
      let request: Request
      try {
        const requestInit = requestTransform(input)

        // In all cases, enforce POST method and set default headers, including auth
        requestInit.method = 'POST'
        const headers = new Headers(requestInit.headers)
        for (const header of this.headers.entries()) {
          const [ name, value ] = header
          headers.set(name, value)
        }
        requestInit.headers = headers

        // Create the request
        const url = new URL(functionName, this.url)
        request = new Request(url, requestInit)
      } catch (error) {
        throw new SerializationError(error)
      }

      // Fetch the response from the server
      let response: Response
      try {
        response = await this.fetch(request)
      } catch (error) {
        throw new FetchError(error)
      }

      // Detect relay errors
      const isRelayError = response.headers.get('x-relay-error')
      if (isRelayError && isRelayError === 'true') {
        throw new RelayError(await response.text())
      }

      // Deserialize the response
      let data: any
      try {
        const responseTransform = invokeOptions?.responseTransform || defaultResponseTransform
        data = await responseTransform(response)
      } catch (error) {
        throw new DeserializationError(error)
      }

      // Detect HTTP status codes other than 2xx and reject as error
      if (!response.ok) {
        throw new HttpError(response.status, response.statusText, data)
      }

      // Return data
      return { data, error: null }
    } catch (error) {
      // Throw if shouldThrowOnError flag is set
      if (this.shouldThrowOnError) {
        throw error
      }
      // Otherwise return error
      else {
        return {
          data: null, error
        }
      }
    }
  }
}

/**
 * This function serializes the most common data types and add the corresponding headers
 * @param data - data can be File, Blob, ArrayBuffer, FormData, string or JSON object
 * @returns a RequestInit object that can be used with the standard Request API to use with fetch()
 */
function defaultRequestTransform (data: any) {
  let requestInit = {} as RequestInit
  requestInit.headers = new Headers()

  if (data instanceof Blob || data instanceof ArrayBuffer) {
    // will work for File as File inherits Blob
    // also works for ArrayBuffer as it is the same underlying structure as a Blob
    requestInit.headers.set('Content-Type', 'application/octet-stream')
    requestInit.body = data
  } else if (typeof data === 'string') {
    // plain string
    requestInit.headers.set('Content-Type', 'text/plain')
    requestInit.body = data
  } else if (data instanceof FormData) {
    // don't set content-type headers
    // Request will automatically add the right boundary value
    requestInit.headers.delete('Content-Type')
    requestInit.body = data
  } else {
    // default, assume this is JSON
    requestInit.headers.set('Content-Type', 'application/json')
    requestInit.body = JSON.stringify(data)
  }
  return requestInit
}

/**
 * This function deserializes the Response object returned by fetch() according to the 'Content-Type' header
 * @param response - the raw Response returned by the fetch call
 * @returns either a plain JSON object, a Blob, or a string (or even a FormData)
 */
async function defaultResponseTransform(response: Response) {
  const contentType = response.headers.get('Content-Type')
  const responseTypes = contentType?.split('; ') // several values can be present and are separated by semicolon
  let data
  // Use of Array.includes() below would be more natural but we are targeting ES2015 so let's go for Array.indexOf()
  if (!responseTypes || responseTypes.indexOf('application/json') >= 0) {
    // by default assume JSON and parse
    data = await response.json()
  } else if (responseTypes.indexOf('application/octet-stream') >= 0) {
    // return Blob type for all byte streams
    // leave it up to user to transform to File or ArrayBuffer if needed
    // as File inherits Blob and Blob has arrayBuffer method
    data = await response.blob()
  } else if (responseTypes.indexOf('text/plain') >= 0) {
    // text string
    data = await response.text()
  } else if (responseTypes.indexOf('multipart/form-data') >= 0 ) {
    // unlikely content-type on a response but let's treat it here nevertheless
    data = await response.formData() 
  } else {
    throw new Error('Unable to deserialize the response as no suitable Content-Type header was found')
  }
  return data
}