export type Fetch = typeof fetch

type requestTransformer = (data: any) => RequestInit
type responseTransformer = (reponse: Response) => Promise<any>

export type FunctionInvokeOptions = {
  requestTransform: requestTransformer
  responseTransform: responseTransformer
}

/**
 * Response format
 *
 */

 interface FunctionsResponseSuccess {
  data: any
  error: null
}
interface FunctionsResponseFailure {
  data: null
  error: any
}
export type FunctionsResponse = FunctionsResponseSuccess | FunctionsResponseFailure
