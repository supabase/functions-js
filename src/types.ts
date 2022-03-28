import crossFetch from 'cross-fetch'

export type Fetch = typeof crossFetch

export enum ResponseType {
  json,
  text,
  arrayBuffer,
  blob,
}

export type FunctionInvokeOptions = {
  headers?: { [key: string]: string }
  body?: Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string
  responseType?: keyof typeof ResponseType
}

export type JSONValue = string | number | boolean | { [key: string]: JSONValue } | Array<JSONValue>

export interface JSONObject {
  [key: string]: JSONValue
}
